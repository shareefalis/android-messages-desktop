import { ipcRenderer } from "electron";
import path from "path";
import { INITIAL_ICON_IMAGE, RESOURCES_PATH } from "./helpers/constants";
import {
  createRecentThreadObserver,
  createUnreadObserver,
  focusFunctions,
  recentThreadObserver,
} from "./helpers/observers";
import { getProfileImg } from "./helpers/profileImage";

window.addEventListener("load", () => {
  const conversationListObserver = new MutationObserver(() => {
    if (document.querySelector("mws-conversations-list") != null) {
      createUnreadObserver();
      createRecentThreadObserver();

      // keep trying to get an image that isnt blank until they load
      const interval = setInterval(() => {
        const conversation = document.body.querySelector(
          "mws-conversation-list-item"
        );
        if (conversation) {
          const canvas = conversation.querySelector(
            "a div.avatar-container canvas"
          ) as HTMLCanvasElement | null;

          if (canvas != null && canvas.toDataURL() != INITIAL_ICON_IMAGE) {
            recentThreadObserver();
            // refresh for profile image loads after letter loads.
            setTimeout(recentThreadObserver, 3000);
            clearInterval(interval);
          }
        }
      }, 250);
      conversationListObserver.disconnect();
    }

    const title = document.head.querySelector("title");
    if (title != null) {
      title.innerText = "Android Messages";
    }
  });

  conversationListObserver.observe(document.body, {
    attributes: false,
    subtree: true,
    childList: true,
  });
});

const OldNotification = window.Notification;

// @ts-ignore
window.Notification = function (title: string, options: NotificationOptions) {
  const icon = getProfileImg(title);

  const hideContent = ipcRenderer.sendSync("should-hide-notification-content");

  const notificationOpts: NotificationOptions = hideContent
    ? {
        body: "Click to open",
        icon: path.resolve(RESOURCES_PATH, "icons", "64x64.png"),
      }
    : {
        icon: icon?.toDataURL(),
        body: options.body || "",
      };

  const newTitle = hideContent ? "New Message" : title;
  const notification = new OldNotification(newTitle, notificationOpts);
  notification.addEventListener("click", () => {
    ipcRenderer.send("show-main-window");
    document.dispatchEvent(new Event("focus"));
  });
  ipcRenderer.send("flash-main-window-if-not-focused");
  return notification;
};

window.Notification.requestPermission = async () => "granted";
//@ts-ignore
window.Notification.permission = "granted";

ipcRenderer.on("focus-conversation", (event, i) => {
  focusFunctions[i]();
});
