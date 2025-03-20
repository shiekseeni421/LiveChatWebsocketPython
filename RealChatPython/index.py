from flask import Flask, request
from flask_socketio import SocketIO, emit
import os
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(
    filename="services_info.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

app = Flask(__name__)

# Load environment variables from .env file
load_dotenv()
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_secret_key')

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

# Log application startup
logging.info("Flask SocketIO server starting...")

agents = {}  # Stores agents {agent_id: "online"}
users = {}   # User-agent mapping {user_id: agent_id}

@socketio.on('register_agent')
def register_agent():
    """Registers an agent and marks them online"""
    agents[request.sid] = "online"  
    logging.info(f'Agent {request.sid} is now online.')
    
    # Notify all users that an agent is available
    emit('agent_status', {'agent_id': request.sid, 'status': 'online'}, broadcast=True)


@socketio.on('request_live_chat')
def request_live_chat():
    """Assigns a user to an available agent"""
    if agents:
        agent_id = next(iter(agents))  # Get any available agent
        users[request.sid] = agent_id
        users[agent_id] = request.sid

        # Notify both parties
        emit('new_live_chat', {'user_id': request.sid}, room=agent_id)
        emit('live_chat_connected', {'agent_id': agent_id}, room=request.sid)

        logging.info(f"User {request.sid} connected with Agent {agent_id}")
    else:
        emit('no_agents_available', room=request.sid)
        logging.info(f"User {request.sid} requested chat but no agents available.")


@socketio.on('send_message')
def send_message(data):
    """Handles message exchange between users and agents"""
    sender_id = request.sid
    receiver_id = users.get(sender_id)

    if not receiver_id:
        logging.warning(f"No recipient found for message from {sender_id}")
        return

    message = data.get('message', '')

    logging.info(f"{sender_id} sent message to {receiver_id}: {message}")
    emit('receive_message', {'from': sender_id, 'message': message}, room=receiver_id)


@socketio.on('disconnect')
def handle_disconnect():
    """Handles user and agent disconnects"""
    sid = request.sid

    # If an agent disconnects
    if sid in agents:
        del agents[sid]
        emit('agent_status', {'agent_id': sid, 'status': 'offline'}, broadcast=True)
        logging.info(f'Agent {sid} went offline.')

    # If a user or agent disconnects from a chat
    partner_id = users.pop(sid, None)
    if partner_id:
        emit('chat_ended', room=partner_id)
        users.pop(partner_id, None)
        logging.info(f"Chat ended between {sid} and {partner_id}.")

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5001)
