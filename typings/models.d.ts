declare module 'api/models' {
  interface Chat {
    _id?: string;
    memberIds?: string[];
    title?: string;
    picture?: string;
    lastMessage?: Message;
    lastMessageCreatedAt?: Date;
    receiverComp?: Tracker.Computation;
    lastMessageComp?: Tracker.Computation;
  }

  interface Message {
    _id?: string;
    chatId?: string;
    senderId?: string;
    ownership?: string;
    content?: string;
    createdAt?: Date;
  }
}