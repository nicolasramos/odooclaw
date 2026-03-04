from odoo import http, SUPERUSER_ID
from odoo.http import request
import json

class OdooClawController(http.Controller):

    @http.route('/odooclaw/reply', type='http', auth='public', methods=['POST'], csrf=False)
    def odooclaw_reply(self, **kwargs):
        """
        Endpoint for OdooClaw to send messages back to an Odoo discussion/thread.
        """
        try:
            payload = json.loads(request.httprequest.data)
            model_name = payload.get('model')
            res_id = payload.get('res_id')
            message = payload.get('message')

            if not model_name or not res_id or not message:
                return request.make_json_response({'status': 'error', 'reason': 'Missing parameters'})

            bot_user = request.env['res.users'].sudo().search([('login', '=', 'odooclaw_bot')], limit=1)
            if not bot_user:
                return request.make_json_response({'status': 'error', 'reason': 'OdooClaw bot user not found'})

            # Perform action as the bot user to circumvent public access rights
            record = request.env[model_name].sudo().browse(res_id)
            if record.exists():
                record.with_user(bot_user).message_post(
                    body=message,
                    author_id=bot_user.partner_id.id,
                    message_type='comment'
                )
                return request.make_json_response({'status': 'ok'})
            
            return request.make_json_response({'status': 'error', 'reason': 'Record not found'})
        except Exception as e:
            return request.make_json_response({'status': 'error', 'reason': str(e)})
