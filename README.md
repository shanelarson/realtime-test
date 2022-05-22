# realtime-test

Setup:

1) Clone the repo
2) run npm install
3) run npm start

Endpoints:
- GET  /getUser/:userId
- GET  /getMutualUsers/:userId/:anotherUserId
- GET  /removeUserFromChatOrChats/:userId/:chatId?
- POST /addChatMessage/:chatId
  - (Post Body = JSON = { "message": "the message they want to send" })
