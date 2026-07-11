from odoo import http, SUPERUSER_ID
from werkzeug.exceptions import HTTPException
from odoo.http import request
import json
from markupsafe import Markup

from ..utils.markdown_html import markdown_to_safe_html
from . import security


class OdooClawController(http.Controller):
    @http.route(
        "/odooclaw/reply", type="http", auth="public", methods=["POST"], csrf=False
    )
    def odooclaw_reply(self, **kwargs):
        """
        Endpoint for OdooClaw to send messages back to an Odoo discussion/thread.
        Supports text messages and voice attachments (voice notes).

        Expected payload:
        {
            "model": "discuss.channel",
            "res_id": 123,
            "message": "Hello!",  // optional if attachment_ids provided
            "attachment_ids": [456, 457],  // optional - voice attachment IDs
            "voice_metadata_ids": [789]  // optional - voice metadata IDs
        }
        """
        try:
            security.authorize()

            payload = json.loads(request.httprequest.data)
            model_name = payload.get("model")
            res_id = payload.get("res_id")
            message_body = payload.get("message", "")
            attachment_ids = payload.get("attachment_ids", [])
            voice_metadata_ids = payload.get("voice_metadata_ids", [])
            reply_token = payload.get("reply_token", "")

            if not model_name or not res_id:
                return security.error_response("Missing parameters")

            # Must have either a message body or attachments
            if not message_body and not attachment_ids:
                return security.error_response("Missing message or attachments")

            # Validate reply token — ensures this reply was solicited by a human message
            if not reply_token:
                return request.make_json_response(
                    {"status": "error", "reason": "Missing reply_token"},
                    status=401
                )
            token_valid = (
                request.env["mail.odooclaw.reply.token"]
                .sudo()
                ._validate(reply_token, model_name, res_id)
            )
            if not token_valid:
                return request.make_json_response(
                    {"status": "error", "reason": "Invalid or expired reply_token"},
                    status=403
                )

            bot_user = (
                request.env["res.users"]
                .sudo()
                .search([("login", "=", "odooclaw_bot")], limit=1)
            )
            if not bot_user:
                return security.error_response("OdooClaw bot user not found")

            message_html = markdown_to_safe_html(message_body)

            # Prepare message_post values
            post_values = {
                "body": Markup(message_html),
                "author_id": bot_user.partner_id.id,
                "message_type": "comment",
            }

            # Add attachments if provided
            if attachment_ids:
                post_values["attachment_ids"] = [(6, 0, attachment_ids)]

            # Add voice metadata if provided (links attachments to voice player)
            if voice_metadata_ids:
                post_values["voice_ids"] = [(6, 0, voice_metadata_ids)]

            # Perform action as the bot user to circumvent public access rights
            record = request.env[model_name].sudo().browse(res_id)
            if record.exists():
                record.with_user(bot_user).sudo().message_post(**post_values)

                # Clear typing indicator after replying
                if model_name == "discuss.channel":
                    bot_member = record.channel_member_ids.filtered(
                        lambda m: m.partner_id.id == bot_user.partner_id.id
                    )
                    if bot_member:
                        bot_member.sudo()._notify_typing(is_typing=False)

                return request.make_json_response({"status": "ok"})

            return security.error_response("Record not found")
        except Exception as e:
            if isinstance(e, (http.Response, HTTPException)):
                raise
            return security.log_exception(security._logger, "odooclaw_reply error")

    @http.route(
        "/odooclaw/call_kw_as_user",
        type="http",
        auth="public",
        methods=["POST"],
        csrf=False,
    )
    def call_kw_as_user(self, **kwargs):
        """
        Executes an ORM method on behalf of a specific user.
        Payload:
        {
            "user_id": 5,
            "model": "sale.order",
            "method": "create",
            "args": [[{...}]],
            "kwargs": {}
        }
        """
        try:
            security.authorize()

            payload = json.loads(request.httprequest.data)
            user_id = payload.get("user_id")
            model = payload.get("model")
            method = payload.get("method")
            args = payload.get("args", [])
            kwargs_dict = payload.get("kwargs", {})
            context_dict = payload.get("context") or {}

            if not user_id or not model or not method:
                return security.error_response("Missing user_id, model, or method")

            # Security: Verify the caller is an internal OdooClaw/Admin session
            if not request.session.uid:
                return security.error_response(
                    "Unauthorized. Must be logged in via session.",
                    status=401,
                )

            caller = request.env.user
            odooclaw_bot = request.env.ref(
                "mail_bot_odooclaw.odooclaw_bot", raise_if_not_found=False
            )
            if not (
                (odooclaw_bot and caller.id == odooclaw_bot.id)
                or caller.has_group("mail_bot_odooclaw.group_odooclaw_delegator")
                or caller.has_group("base.group_system")
            ):
                return security.error_response(
                    "Unauthorized. Delegated RPC permission required.",
                    status=401,
                )

            try:
                user_id = int(user_id)
            except (TypeError, ValueError):
                return security.error_response("Invalid user_id")

            target_user = request.env["res.users"].sudo().browse(user_id)
            if user_id == SUPERUSER_ID or not target_user.exists() or not target_user.active:
                return security.error_response("Invalid delegated user")

            # Merge explicit context from caller if provided
            if not isinstance(kwargs_dict, dict):
                kwargs_dict = {}
            if not isinstance(context_dict, dict):
                context_dict = {}

            merged_context = dict(request.env.context)
            merged_context.update(context_dict)

            # Switch environment to the requested user with provided context
            safe_env = request.env(user=user_id, context=merged_context)

            # Execute the method safely
            try:
                recs = safe_env[model]
                if args and (
                    isinstance(args[0], int)
                    or (
                        isinstance(args[0], list)
                        and (not args[0] or isinstance(args[0][0], int))
                    )
                ):
                    if method not in (
                        "search",
                        "create",
                        "search_read",
                        "search_count",
                        "fields_get",
                    ):
                        recs = recs.browse(args.pop(0))

                result = getattr(recs, method)(*args, **kwargs_dict)
                if hasattr(result, "_name") and hasattr(result, "ids"):
                    if method in ("create", "message_post") and len(result.ids) == 1:
                        result = result.ids[0]
                    else:
                        result = result.ids
                return request.make_json_response({"status": "ok", "result": result})
            except Exception as orm_error:
                return security.error_response("Odoo ORM error", status=500)

        except Exception as e:
            if isinstance(e, (http.Response, HTTPException)):
                raise
            return security.log_exception(security._logger, "call_kw_as_user error")
