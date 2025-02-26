import os
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# Set your verify token (must match Facebook Webhook settings)
VERIFY_TOKEN = "my4psbot123"  # Change this to your secret token

# Get the PAGE_ACCESS_TOKEN from Railway Environment Variables
PAGE_ACCESS_TOKEN = os.environ.get("PAGE_ACCESS_TOKEN")

@app.route("/", methods=["GET"])
def verify():
    """Webhook verification for Facebook Messenger"""
    mode = request.args.get("hub.mode")
    token = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")

    if mode == "subscribe" and token == VERIFY_TOKEN:
        print("Webhook Verified!")
        return challenge
    return "Verification failed", 403

@app.route("/", methods=["POST"])
def webhook():
    """Handles incoming messages from Messenger"""
    data = request.get_json()
    
    # Check if the event is a message
    if data.get("object") == "page":
        for entry in data["entry"]:
            for messaging_event in entry.get("messaging", []):
                if "message" in messaging_event:
                    sender_id = messaging_event["sender"]["id"]
                    message_text = messaging_event["message"]["text"]
                    
                    # Reply to the user
                    send_message(sender_id, f"You said: {message_text}")
                    
    return "EVENT_RECEIVED", 200

def send_message(recipient_id, text):
    """Sends a message back to the user"""
    url = "https://graph.facebook.com/v17.0/me/messages"
    headers = {"Content-Type": "application/json"}
    payload = {
        "recipient": {"id": recipient_id},
        "message": {"text": text},
        "messaging_type": "RESPONSE"
    }
    
    params = {"access_token": PAGE_ACCESS_TOKEN}
    response = requests.post(url, headers=headers, json=payload, params=params)
    
    if response.status_code != 200:
        print("Error sending message:", response.text)

# Use Railway-assigned PORT or default to 5000
PORT = int(os.environ.get("PORT", 5000))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
