import 'meteor-client-side';
// import "./polyfills.ts";  
// import 'reflect-metadata';
import 'api/methods';
import { Component, ViewChild } from '@angular/core';
import { ionicBootstrap, Platform, Nav, Storage, LocalStorage } from 'ionic-angular';
import { StatusBar } from 'ionic-native';
import { SearchJobsPage } from './pages/searchjobs/searchjobs';
import { LoginPage } from './pages/login/login';
import { LogoutPage } from './pages/logout/logout';
import { PersonModel } from './pages/model/personModel';
import { ChatsPage } from './pages/chats/chats';
import { UtilityService } from './pages/utils/utilityService';
import {METEOR_PROVIDERS} from 'angular2-meteor';
import * as Check from 'meteor/check';
import * as EJSON from 'meteor/ejson';
//import {Push, PushToken, CloudSettings, provideCloud} from '@ionic/cloud-angular';

(<any>Object).assign(window,
  Check,
  EJSON
);

// const cloudSettings: CloudSettings = {
//   'core': {
//     'app_id': '8b0bb5a2',
//   },
//   'push': {
//     'sender_id': '265200630873',
//     'pluginConfig': {
//       'ios': {
//         'badge': true,
//         'sound': true
//       },
//       'android': {
//         'iconColor': '#343434'
//       }
//     }
//   }
// };

@Component({
  templateUrl: 'build/app.html',
  providers: [UtilityService]//, Push]
})
class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage: any = SearchJobsPage;

  private local: Storage = null;
  private pages: Array<{ title: string, component: any }>;
  private pages_person: Array<{ title: string, component: any }>;
  private menuTitle: string = 'Menu';
  private personModel: PersonModel = null;
  private utilityService: UtilityService = null;
  //private push: Push = null;

  constructor(private platform: Platform, utilityService: UtilityService) {//, push: Push) {
    this.local = new Storage(LocalStorage);
    this.utilityService = utilityService;
    //this.push = push;
    this.initializeApp();

    // used for an example of ngFor and navigation
    this.pages = [
      { title: 'Search', component: SearchJobsPage },
      { title: 'Login', component: LoginPage },
      { title: 'Messages', component: ChatsPage }
    ];

    this.pages_person = [
      { title: 'Search', component: SearchJobsPage },
      { title: 'Logout', component: LogoutPage },
      { title: 'Messages', component: ChatsPage }
    ];
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();
      //this.pushNotifications();
    });
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component);
  }

  // see:   https://forum.ionicframework.com/t/push-notification-recommendations-for-a-messaging-app/62656/12
  // pushNotifications(): void {

  //   this.push.register().then((t: PushToken) => {
  //     return this.push.saveToken(t);
  //   }).then((t: PushToken) => {
  //     console.log('Token saved:', t.token);
  //   });

  //   this.push.rx.notification()
  //     .subscribe((msg) => {
  //       alert(msg.title + ': ' + msg.text);
  //     });

  // }

}

ionicBootstrap(MyApp, [METEOR_PROVIDERS]);//, [provideCloud(cloudSettings)]);

