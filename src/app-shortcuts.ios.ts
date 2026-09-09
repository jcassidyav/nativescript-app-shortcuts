import { Application, NativeWindowEvents, Utils } from "@nativescript/core";
import { AppShortcutsAPI, LaunchQuickAction, QuickAction } from "./app-shortcuts.common";

const iOSApplication = Application.ios;
const iOSUtils = Utils.ios;
  
let quickActionCallback: (data: LaunchQuickAction) => void;
let lastQuickAction: any = null;

const callback = (shortcutItem: UIApplicationShortcutItem, completionHandler: (p1: boolean) => void) => {
  if (quickActionCallback !== null && quickActionCallback !== undefined) {
    quickActionCallback(shortcutItem);
  } else {
    lastQuickAction = shortcutItem;
  }
};

export class AppShortcuts implements AppShortcutsAPI {
  // caching for efficiency
  private availability: boolean | null = null;

  private static _launchedByShortcut: boolean = false;
  static get LaunchedByShortcut(): boolean {
    return AppShortcuts._launchedByShortcut;
  }

static Init() {
    Application.ios.on(NativeWindowEvents.scenePerformActionForShortcutItem, (args) => {
      console.log("AppShortcuts: NativeWindowEvents.scenePerformActionForShortcutItem");
      callback(args.shortcutItem, args.completionHandler);
      console.log("AppShortcuts: NativeWindowEvents.scenePerformActionForShortcutItem callback complete");
    });
    Application.ios.on(NativeWindowEvents.sceneWillConnect, (args) => {
      console.log("AppShortcuts: NativeWindowEvents.sceneWillConnect");
      if (args){
        console.log("AppShortcuts: NativeWindowEvents.sceneWillConnect args.ios is defined");
        if(args.connectionOptions){
            console.log("AppShortcuts: NativeWindowEvents.sceneWillConnect args.ios.connectionOptions is defined");
          if(args.connectionOptions.shortcutItem){
            console.log("AppShortcuts: NativeWindowEvents.sceneWillConnect args.ios.connectionOptions.shortcutItem is defined");
            AppShortcuts._launchedByShortcut = true;
        console.log("AppShortcuts: NativeWindowEvents.sceneWillConnect shortcutItem found");
        callback(args.connectionOptions.shortcutItem, (p1) => {
          console.log("AppShortcuts: NativeWindowEvents.sceneWillConnect shortcutItem callback complete");
        });
      }}}
    });
}

  public available(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {

      if (this.availability !== null) {
        resolve(this.availability);
        return;
      }

      // With iOS 13 probably any iOS device supports this feature, because 3D Touch is no longer required
      if (Utils.SDK_VERSION >= 13) {
        resolve(true);
        return;
      }

      // iOS 9 added 3D Touch capability
      if (Utils.SDK_VERSION >= 9) {
        // .. but not all devices running iOS 9 support it
        if (iOSApplication.nativeApp.keyWindow === null) {
          // (especially) in Angular apps, this might run too soon. Wrapping it in a timeout solves that issue.
          setTimeout(() => {
            this.availability = UIForceTouchCapability.Available === iOSApplication.nativeApp.keyWindow?.rootViewController?.traitCollection.forceTouchCapability;
            resolve(this.availability);
          });
        } else {
          this.availability = UIForceTouchCapability.Available === iOSApplication.nativeApp.keyWindow?.rootViewController?.traitCollection.forceTouchCapability;
          resolve(this.availability);
        }
      } else {
        this.availability = false;
        resolve(this.availability);
      }
    });
  }

  public setQuickActionCallback(callback: (data: LaunchQuickAction) => void) {
    quickActionCallback = callback;
    if (lastQuickAction !== null) {
      quickActionCallback(lastQuickAction);
      lastQuickAction = null;
    }
  }

  public configureQuickActions(actions: Array<QuickAction>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.available().then(avail => {
        if (!avail) {
          reject("3D Touch not available");
          return;
        }

        const items: any[] = [];

        actions.map(action => {
          let uiApplicationShortcutIcon = null;

          if (action.iconType) {
            uiApplicationShortcutIcon = UIApplicationShortcutIcon.iconWithType(action.iconType);
          } else if (action.iconTemplate) {
            uiApplicationShortcutIcon = UIApplicationShortcutIcon.iconWithTemplateImageName(action.iconTemplate);
          }

          items.push(
              UIApplicationShortcutItem.alloc().initWithTypeLocalizedTitleLocalizedSubtitleIconUserInfo(
                  action.type,
                  action.title,
                  action.subtitle as string,
                  uiApplicationShortcutIcon as UIApplicationShortcutIcon,
                  null as unknown as NSDictionary<string, NSSecureCoding>));
        });

        
        iOSApplication.nativeApp.shortcutItems = items as unknown as NSArray<UIApplicationShortcutItem>;

        resolve();
      });
    });
  }
}
