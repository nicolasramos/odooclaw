from odoo import http, SUPERUSER_ID
from odoo.http import request
import json


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

            # Must have either a message body or attachments
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

            # Prepare message_post values
            post_values = {
                "body": message_body,
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
                record.with_user(bot_user).message_post(**post_values)

                # Clear typing indicator after replying
                if model_name == "discuss.channel":
                    bot_member = record.channel_member_ids.filtered(
                        lambda m: m.partner_id.id == bot_user.partner_id.id
                    )
                    if bot_member:
                        bot_member.sudo()._notify_typing(is_typing=False)

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

            # Security: Verify the caller is an internal OdooClaw/Admin session
            # For now, we assume if you can hit this and you have a valid session id
            # (which the Python MCP server does), you are authorized.
            if not request.session.uid:
                return request.make_json_response(
                    {
                        "status": "error",
                        "reason": "Unauthorized. Must be logged in via session.",
                    }
                )

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
                result = getattr(safe_env[model], method)(*args, **kwargs_dict)
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
