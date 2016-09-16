import {Component, OnInit, OnDestroy} from '@angular/core';
import {NavParams, NavController, Events} from 'ionic-angular';
import {MeteorComponent} from 'angular2-meteor';
import {DateFormatPipe} from 'angular2-moment';
import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';
import {Chat, Message} from 'api/models';
import {Messages} from 'api/collections';
import { UtilityService } from '../utils/utilityService';
import { PersonModel } from '../model/personModel';
import { LoginPage } from '../login/login';

@Component({
  templateUrl: 'build/pages/messages/messages.html',
  pipes: [DateFormatPipe],
  providers: [UtilityService]
})
export class MessagesPage extends MeteorComponent implements OnInit, OnDestroy {
  message = '';
  title: string;
  picture: string;
  messages: Mongo.Cursor<Message>;
  private isEven = false;
  private senderId: string;
  private activeChat: Chat;
  private autoScroller: MutationObserver;
  private utilityService: UtilityService = null;
  private events: Events = null;

  constructor(navParams: NavParams, private nav: NavController, utilityService: UtilityService, events: Events) {
    super();
    this.events = events;
    this.nav = nav;
    this.utilityService = utilityService;
    this.activeChat = <Chat>navParams.get('chat');
    this.loadMessages();
  }

  private loadMessages(): void {
    let promise: Promise<string> = this.utilityService.getLoggedInPerson();
    if (promise) {
      promise.then((data) => {
        let personModelLoggedIn: PersonModel = JSON.parse(data);
        if (personModelLoggedIn) {
          this.senderId = 'P' + personModelLoggedIn.id;
          this.title = this.activeChat.title;
          this.picture = this.activeChat.picture;
          this.subscribe('messages', this.activeChat._id, this.senderId, () => {
            this.autorun(() => {
              this.messages = this.findMessages();
            });
          });

        } else {
          this.nav.push(LoginPage, {
            fromMessages: true
          });
        }
      });
    } else {
      this.nav.push(LoginPage, {
        fromMessages: true
      });
    }
  }

  ngOnInit(): void {
    this.autoScroller = this.autoScroll();
  }

  ngOnDestroy(): void {
    this.autoScroller.disconnect();
  }

  private autoScroll(): MutationObserver {
    const autoScroller = new MutationObserver(this.scrollDown.bind(this));

    autoScroller.observe(this.messagesList, {
      childList: true,
      subtree: true
    });

    return autoScroller;
  }

  private scrollDown(): void {
    this.scroller.scrollTop = this.scroller.scrollHeight;
    this.messageEditor.focus();
  }

  private get messagesPageContent(): Element {
    return document.querySelector('.messages-page-content');
  }

  private get messagesPageFooter(): Element {
    return document.querySelector('.messages-page-footer');
  }

  private get messagesList(): Element {
    return this.messagesPageContent.querySelector('.messages');
  }

  private get messageEditor(): HTMLInputElement {
    return <HTMLInputElement>this.messagesPageFooter.querySelector('.message-editor');
  }

  private get scroller(): Element {
    return this.messagesList.querySelector('scroll-content');
  }

  onInputKeypress({keyCode}: KeyboardEvent): void {
    if (keyCode == 13) {
      this.sendMessage();
    }
  }

  sendMessage(): void {
    this.call('addMessage', this.senderId, this.activeChat._id, this.message);
    this.message = '';
    this.events.publish('messages:update');
  }

  private findMessages(): Mongo.Cursor<Message> {
    return Messages.find({
      chatId: this.activeChat._id
    }, {
        sort: { createdAt: 1 },
        transform: this.transformMessage.bind(this)
      });
  }

  private transformMessage(message): Message {
    message.ownership = this.senderId == message.senderId ? 'mine' : 'other';
    this.isEven = !this.isEven;
    return message;
  }
}