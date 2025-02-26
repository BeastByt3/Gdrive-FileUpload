from flask import Flask, request
import requests

app = Flask(__name__)

VERIFY_TOKEN = "my4psbot123"
PAGE_ACCESS_TOKEN = "EAANlu9ZCmDo0BOZBrNQhbfxkSYd4MiJrrVBeZBDifOM9gQhTHqz5R3IVpsrk0Uv8oEyFUVx3tisGZARE0druzx2KNZA9VYjuUVJn6xvN4VkvCXhyEbAIv66wyUlAQy9D1ZCkfecBvBjz99qZA6AtGbTyvGttqYud2G7XSKV66e9SgRxurpF8AFtIsPZBknM9x3Pt"

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
    app.run(host="0.0.0.0", port=5000)

