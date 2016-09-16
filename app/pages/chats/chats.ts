import {Component} from '@angular/core';
import {NavController, NavParams, ViewController, AlertController, Events} from 'ionic-angular';
import {MeteorComponent} from 'angular2-meteor';
import {CalendarPipe} from 'angular2-moment';
import {Mongo} from 'meteor/mongo';
import {Chat, Message} from 'api/models';
import {Chats, Messages} from 'api/collections';
import {MessagesPage} from '../messages/messages';
import { UtilityService } from '../utils/utilityService';
import { PersonModel } from '../model/personModel';
import { JobModel } from '../model/jobModel';
import { LoginPage } from '../login/login';
import { JobService } from '../service/jobService';
import { PersonService } from '../service/personService';


@Component({
  templateUrl: 'build/pages/chats/chats.html',
  pipes: [CalendarPipe],
  providers: [UtilityService, JobService, PersonService]
})
export class ChatsPage extends MeteorComponent {
  chats: Mongo.Cursor<Chat>;
  private utilityService: UtilityService = null;
  private jobService: JobService = null;
  private personService: PersonService = null;
  private personModelLoggedIn: PersonModel = null;
  private personModels: PersonModel[] = [];
  private jobModels: JobModel[] = [];
  private jobModelsForSender: JobModel[] = [];
  private personModel: PersonModel = null;
  private jobModel: JobModel = null;
  private senderId: string = null;
  private events: Events = null;

  constructor(private navCtrl: NavController, private navParams: NavParams, private viewCtrl: ViewController, private alertCtrl: AlertController, utilityService: UtilityService, jobService: JobService, personService: PersonService, events: Events) {
    super();
    this.events = events;
    this.utilityService = utilityService;
    this.jobService = jobService;
    this.personService = personService;
    this.setParams();
    this.subscribeEvents();
  }

  private subscribeEvents(): void {
    this.events.subscribe('messages:update', (data) => {
      let promise: Promise<Mongo.Cursor<Chat>> = this.findChats(this.senderId);
      promise.then((data) => {
        this.chats = data;
      });
    });
  }

  private setParams(): void {
    this.jobModel = this.navParams.get('jobModel');
    this.personModel = this.navParams.get('personModel');
    let promise: Promise<string> = this.utilityService.getLoggedInPerson();
    if (promise) {
      promise.then((data) => {
        let personModelLoggedIn: PersonModel = JSON.parse(data);
        if (personModelLoggedIn) {
          this.personModelLoggedIn = personModelLoggedIn;
          this.senderId = 'P' + this.personModelLoggedIn.id;

          let promiseJobsForPerson: Promise<JobModel[]> = this.jobService.getJobsByPerson(personModelLoggedIn.id);
          promiseJobsForPerson.then((data) => {
            this.jobModelsForSender = data;
            console.log('logged in as ' + this.senderId);
            this.loadChats();
          });

        } else {
          this.navCtrl.push(LoginPage, {
            fromChats: true
          });
        }
      });
    } else {
      this.navCtrl.push(LoginPage, {
        fromChats: true
      });
    }
  }

  findChat(senderId: string, receiverId: string): Chat {
    const chat: Chat = Chats.findOne({
      memberIds: { $all: [senderId, receiverId] }
    });
    return chat;
  }

  showMessages(chat): void {
    this.navCtrl.push(MessagesPage, { chat });
  }

  removeChat(chat): void {
    this.call('removeChat', this.senderId, chat._id);
  }

  private loadChats(): void {
    console.log('first subscribe as ' + this.senderId);
    let promise: Promise<Mongo.Cursor<Chat>> = this.findChats(this.senderId);
    promise.then((data) => {
      const chats1 = data;
      const recieverIds: string[] = chats1
        .map(({memberIds}) => memberIds)
        .reduce((result, memberIds) => result.concat(memberIds), [])
        .concat(this.senderId);
      this.getMatchingData(recieverIds, chats1);
    });
  }

  private getMatchingData(recieverIds: string[], chats: Mongo.Cursor<Chat>): void {
    if (this.jobModel) {
      if (recieverIds.indexOf('J' + this.jobModel.id) < 0) {
        recieverIds.push('J' + this.jobModel.id);
      }
    }
    if (this.personModel) {
      if (recieverIds.indexOf('P' + this.personModel.id) < 0) {
        recieverIds.push('P' + this.personModel.id);
      }
    }
    recieverIds = this.removeDuplicates(recieverIds);
    console.log('getMatchingData ' + recieverIds);
    let jobIds: string = '';
    let personIds: string = '';
    for (let i = 0; i < recieverIds.length; i++) {
      if (recieverIds[i] && recieverIds[i].substring(0, 1) == 'J') {
        jobIds += recieverIds[i].substring(1, recieverIds[i].length);
        jobIds += ',';
      } else if (recieverIds[i] && recieverIds[i].substring(0, 1) == 'P') {
        personIds += recieverIds[i].substring(1, recieverIds[i].length);
        personIds += ',';
      }
    }
    jobIds = jobIds.substring(0, jobIds.length - 1);
    personIds = personIds.substring(0, personIds.length - 1);

    let promiseJobs: Promise<JobModel[]> = this.jobService.getJobs(jobIds);
    promiseJobs.then((jobModels: JobModel[]) => {
      for (var index = 0; index < jobModels.length; index++) {
        this.jobModels.push(jobModels[index]);
      }
      let promisePersons: Promise<PersonModel[]> = this.personService.getPersons(personIds);
      promisePersons.then((personModels: PersonModel[]) => {
        for (var index = 0; index < personModels.length; index++) {
          this.personModels.push(personModels[index]);
        }

        if ((this.jobModels && this.jobModels.length > 0) || (this.personModels && this.personModels.length > 0)) {
          console.log('second subscribe as ' + this.senderId);
          let promise: Promise<Mongo.Cursor<Chat>> = this.findChats(this.senderId);
          promise.then((data) => {
            this.chats = data;
            this.chats.observe({
              changed: (newChat, oldChat) => this.disposeChat(oldChat),
              removed: (chat) => this.disposeChat(chat)
            });
            this.addNewChatAndShowMessage();
          });
        }
      });
    });
  }

  private addNewChatAndShowMessage() {
    if (this.jobModel) {
      let jobId: string = 'J' + this.jobModel.id;
      let chat: Chat = this.findChat(this.senderId, jobId);
      if (!chat) {
        this.addChat(jobId);
        this.addNewChatAndShowMessage();
      } else {
        chat = this.transformChat(chat);
        let that = this;
        setTimeout(function () { that.showMessages(chat); }, 300); // need to wait for chat to be added on the Meteor Mongo
      }
    } else if (this.personModel) {
      let personId: string = 'P' + this.personModel.id;
      let chat: Chat = this.findChat(this.senderId, personId);
      if (!chat) {
        this.addChat(personId);
        this.addNewChatAndShowMessage();
      } else {
        chat = this.transformChat(chat);
        let that = this;
        setTimeout(function () { that.showMessages(chat); }, 300); // need to wait for chat to be added on the Meteor Mongo
      }
    }
  }

  private transformChat(chat): Chat {
    try {
      const receiverId = chat.memberIds.find(memberId => memberId != this.senderId);
      let profileName: string = null;
      let profilePicture: string = null;

      for (let i = 0; i < this.jobModels.length; i++) {
        if (receiverId == 'J' + this.jobModels[i].id) {
          profileName = this.jobModels[i].person.firstName + ' ' + this.jobModels[i].person.lastName;
          profilePicture = decodeURIComponent(window.atob(this.jobModels[i].avatar));
        }
      }

      for (let i = 0; i < this.personModels.length; i++) {
        if (receiverId == 'P' + this.personModels[i].id) {
          profileName = this.personModels[i].firstName + ' ' + this.personModels[i].lastName;
        }
      }

      if (profileName && profileName != null) {
        chat.title = profileName;
      }
      if (profilePicture && profilePicture != null) {
        chat.picture = profilePicture;
      }

      chat.lastMessage = this.findLastMessage(chat);
      if (chat.lastMessage) {
        chat.lastMessageCreatedAt = chat.lastMessage.createdAt;
      } else {
        chat.lastMessageCreatedAt = new Date();
      }
    } catch (e) {
      console.log('error in transformChat');
    }

    return chat;
  }

  private findLastMessage(chat: Chat): Message {
    return Messages.findOne({
      chatId: chat._id
    }, {
        sort: { createdAt: -1 }
      });
  }

  private disposeChat(chat: Chat): void {
    if (chat.receiverComp) {
      chat.receiverComp.stop();
    }
    if (chat.lastMessageComp) {
      chat.lastMessageComp.stop();
    }
  }

  private findChats(senderId: string): Promise<Mongo.Cursor<Chat>> {
    // for (let i = 0; i < this.jobModelsForSender.length; i++) {
    //   console.log('job: ' + this.jobModelsForSender[i].id);
    // }

    console.log(JSON.stringify(Chats.find().fetch(), null, 2));


    let promise: Promise<Mongo.Cursor<Chat>> = new Promise<Mongo.Cursor<Chat>>(resolve => {
      this.subscribe('chats', this.senderId, () => {
        const chats: Mongo.Cursor<Chat> = Chats.find(
          { memberIds: this.senderId },
          {
            sort: { lastMessageCreatedAt: -1 },
            transform: this.transformChat.bind(this),
            fields: { memberIds: 1, lastMessageCreatedAt: 1 } 
          }
        );
        resolve(chats);
      });
    });
    return promise;
  }

  private addChat(userId: string): void {
    this.call('addChat', this.senderId, userId, (e: Error) => {
      this.viewCtrl.dismiss().then(() => {
        if (e) return this.doAlert(e);
      });
    });
  }

  private doAlert(e: Error) {
    console.error(e);
    let alert = this.alertCtrl.create({
      title: 'Oops!',
      subTitle: e.message,
      buttons: ['OK']
    });
    alert.present();
  }

  private removeDuplicates(arr: string[]): string[] {
    var unique: string[] = arr.filter(function (elem, index, self) {
      return index == self.indexOf(elem);
    })
    return unique;
  }
}