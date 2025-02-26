from flask import Flask, request
import requests

app = Flask(__name__)

VERIFY_TOKEN = "your_verify_token"
PAGE_ACCESS_TOKEN = "your_page_access_token"

@app.route("/", methods=["GET"])
def verify():
    if request.args.get("hub.verify_token") == VERIFY_TOKEN:
        return request.args.get("hub.challenge")
    return "Verification failed."

@app.route("/", methods=["POST"])
def webhook():
    data = request.get_json()
    for entry in data["entry"]:
        for message in entry["messaging"]:
            if "message" in message:
                sender_id = message["sender"]["id"]
                text = message["message"]["text"].lower()
                response = "I can answer 4Ps questions!"
                if "apply" in text:
                    response = "You can apply at your local DSWD office."
                send_message(sender_id, response)
    return "OK"

def send_message(recipient_id, text):
    url = f"https://graph.facebook.com/v17.0/me/messages?access_token={PAGE_ACCESS_TOKEN}"
    payload = {"recipient": {"id": recipient_id}, "message": {"text": text}}
    requests.post(url, json=payload)

if __name__ == "__main__":
    app.run(port=5000)
