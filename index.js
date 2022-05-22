import http from "http";

import express from "express";
import bodyParser from "body-parser";
import _ from "lodash";

const getInitialExternalData = async () => {
    return new Promise((resolve, reject) => {
        http.get('http://localhost:4001/chats', (res) => {
            let response = "";
            res.on('data', (d) => {
                response += d;
            });
            res.on('end', () => {
                try {
                    const responseParsed = JSON.parse(response);
                    resolve(responseParsed);
                } catch (e) {
                    //
                    reject('failed to parse response');
                }
            });
        }).on('error', (e) => {
            reject('failed to retrieve response');
        });
    });
};

const findUserInUsersByUserId = (userId, users) => {
    return users.find(user => {
        return user.userId === userId;
    });
};

const findChatsInChatsByUsername = (username, chats) => {
    return chats.filter(chat => {
        return chat.participants.find(participant => {
            return participant === username;
        });
    });
};

const mustBeAuthorized = (req, res, next) => {
    // I would do a deeper check here if this was a real application
    if (req.headers.authorization && req.headers.authorization === 'someAuthToken') {
        next();
    } else {
        res.json({
            error: {
                message: 'must provide a valid authorization token in the headers'
            }
        });
    }
};

const getChatByChatId = (chatId, chats) => {
    return chats.find(chat => {
        return chat.chatId === chatId;
    });
};

const initializeExpress = (initialExternalData) => {
    const app = express();

    app.use(bodyParser.json())

    app.use(mustBeAuthorized);

    app.get('/getUser/:userId', (req, res) => {
        const {userId} = req.params;
        const foundUser = findUserInUsersByUserId(userId, initialExternalData.users);
        if (foundUser) {
            const {username} = foundUser;
            const foundChats = findChatsInChatsByUsername(username, initialExternalData.chats);
            return res.json({
                user: foundUser,
                chats: foundChats
            });
        } else {
            return res.json({
                error: {
                    message: `no user with the user id (${userId}) found`
                }
            });
        }
    });

    app.get('/getMutualUsers/:userId/:anotherUserId', (req, res) => {
        const {userId, anotherUserId} = req.params;
        const foundUser = findUserInUsersByUserId(userId, initialExternalData.users);
        const foundAnotherUser = findUserInUsersByUserId(anotherUserId, initialExternalData.users);
        if (foundUser && foundAnotherUser) {
            const {username} = foundUser;
            const anotherUsername = foundAnotherUser.username;
            const foundChats = findChatsInChatsByUsername(username, initialExternalData.chats);
            let usernamesChattedWith = [];
            foundChats.forEach(foundChat => {
                foundChat.participants.forEach(participant => {
                    if (participant !== username) {
                        usernamesChattedWith.push(participant);
                    }
                });
            });
            usernamesChattedWith = _.uniq(usernamesChattedWith);
            const foundAnotherChats = findChatsInChatsByUsername(anotherUsername, initialExternalData.chats);
            let anotherUsernamesChattedWith = [];
            foundAnotherChats.forEach(foundChat => {
                foundChat.participants.forEach(participant => {
                    if (participant !== username) {
                        anotherUsernamesChattedWith.push(participant);
                    }
                });
            });
            anotherUsernamesChattedWith = _.uniq(anotherUsernamesChattedWith);
            const mutualUsers = usernamesChattedWith.filter(usernameChattedWith => {
                return anotherUsernamesChattedWith.includes(usernameChattedWith);
            });
            return res.json({
                mutualUsers,
            });
        } else {
            return res.json({
                error: {
                    message: `there was not a user found for both user id (${userId}) and user id (${anotherUserId})`
                }
            });
        }
    });

    app.post('/addChatMessage/:chatId', (req, res) => {
        const {chatId} = req.params;
        const {message} = req.body;
        const chatToUpdate = getChatByChatId(chatId, initialExternalData.chats);
        if (chatToUpdate) {
            if (chatToUpdate.messages) {
                chatToUpdate.messages.push(message);
            } else {
                chatToUpdate.messages = [message];
            }
            res.json({
                acknowledged: true
            });
        } else {
            return res.json({
                error: {
                    message: `no chat with the chat id (${chatId}) found`
                }
            });
        }
    });

    app.get('/removeUserFromChatOrChats/:userId/:chatId?', (req, res) => {
        const {userId, chatId} = req.params;
        const user = findUserInUsersByUserId(userId, initialExternalData.users);
        if (user) {
            if (chatId) {
                const chatToUpdate = getChatByChatId(chatId, initialExternalData.chats);
                if (chatToUpdate) {
                    const participantIndex = chatToUpdate.participants.indexOf(user.username);
                    if (participantIndex) {
                        chatToUpdate.participants.splice(participantIndex, 1);
                    }
                    res.json({
                        acknowledged: true
                    });
                } else {
                    return res.json({
                        error: {
                            message: `no chat with the chat id (${chatId}) found`
                        }
                    });
                }
            } else {
                for(let i = 0; i < initialExternalData.chats.length; i++) {
                    const chatToUpdate = initialExternalData.chats[i];
                    const participantIndex = chatToUpdate.participants.indexOf(user.username);
                    if (participantIndex !== -1) {
                        chatToUpdate.participants.splice(participantIndex, 1);
                    }
                }
                res.json({
                    acknowledged: true
                });
            }
        } else {
            return res.json({
                error: {
                    message: `no user with the user id (${userId}) found`
                }
            });
        }
    });

    app.listen(3000);
};

const startup = async () => {
    // I would handle the state different if this was a real application but for this I am just passing it a long
    const initialExternalData = await getInitialExternalData();
    initializeExpress(initialExternalData);
};

(async () => {
    await startup();
})();
