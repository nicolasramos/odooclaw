from odoo import http, SUPERUSER_ID
from odoo.http import request
import json
from markupsafe import Markup

from ..utils.markdown_html import markdown_to_safe_html


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
            "model": "mail.channel",
            "res_id": 123,
            "message": "Hello!",
            "attachment_ids": [456, 457],
            "voice_metadata_ids": [789]
        }
        """
        try:
            payload = json.loads(request.httprequest.data)
            model_name = payload.get("model")
            res_id = payload.get("res_id")
            message_body = payload.get("message", "")
            attachment_ids = payload.get("attachment_ids", [])
            voice_metadata_ids = payload.get("voice_metadata_ids", [])

            if not model_name or not res_id:
                return request.make_json_response(
                    {"status": "error", "reason": "Missing parameters"}
                )

            if not message_body and not attachment_ids:
                return request.make_json_response(
                    {"status": "error", "reason": "Missing message or attachments"}
                )

            bot_user = (
                request.env["res.users"]
                .sudo()
                .search([("login", "=", "odooclaw_bot")], limit=1)
            )
            if not bot_user:
                return request.make_json_response(
                    {"status": "error", "reason": "OdooClaw bot user not found"}
                )

            message_html = markdown_to_safe_html(message_body)

            post_values = {
                "body": Markup(message_html),
                "author_id": bot_user.partner_id.id,
                "message_type": "comment",
            }

            if attachment_ids:
                post_values["attachment_ids"] = [(6, 0, attachment_ids)]

            if voice_metadata_ids:
                post_values["voice_ids"] = [(6, 0, voice_metadata_ids)]

            record = request.env[model_name].sudo().browse(res_id)
            if record.exists():
                record.with_user(bot_user).message_post(**post_values)

                if model_name == "mail.channel":
                    channel_partner = request.env["mail.channel.member"].search(
                        [
                            ("channel_id", "=", record.id),
                            ("partner_id", "=", bot_user.partner_id.id),
                        ],
                        limit=1,
                    )
                    if channel_partner:
                        channel_partner._notify_typing(is_typing=False)

                return request.make_json_response({"status": "ok"})

            return request.make_json_response(
                {"status": "error", "reason": "Record not found"}
            )
        except Exception as e:
            return request.make_json_response({"status": "error", "reason": str(e)})

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
            payload = json.loads(request.httprequest.data)
            user_id = payload.get("user_id")
            model = payload.get("model")
            method = payload.get("method")
            args = payload.get("args", [])
            kwargs_dict = payload.get("kwargs", {})
            context_dict = payload.get("context") or {}

            if not user_id or not model or not method:
                return request.make_json_response(
                    {"status": "error", "reason": "Missing user_id, model, or method"}
                )

            if not request.session.uid:
                return request.make_json_response(
                    {
                        "status": "error",
                        "reason": "Unauthorized. Must be logged in via session.",
                    }
                )

            if not isinstance(kwargs_dict, dict):
                kwargs_dict = {}
            if not isinstance(context_dict, dict):
                context_dict = {}

            merged_context = dict(request.env.context)
            merged_context.update(context_dict)

            safe_env = request.env(user=user_id, context=merged_context)

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
                return request.make_json_response(
                    {
                        "status": "error",
                        "reason": f"Odoo Access/ORM Error: {str(orm_error)}",
                    }
                )

        except Exception as e:
            return request.make_json_response({"status": "error", "reason": str(e)})
