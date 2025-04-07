import { MessageApi, DialogApi, NotificationApi, LoadingBarApi } from 'naive-ui'
import { ExposedApi } from '@preload/types'

declare global {
  interface Window {
    $message: MessageApi
    $dialog: DialogApi
    $notification: NotificationApi
    $loadingBar: LoadingBarApi
    electronAPI: ExposedApi
  }
}

export {}
