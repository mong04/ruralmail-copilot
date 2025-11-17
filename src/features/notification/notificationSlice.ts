import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationState {
  message: string;
  description?: string;
  type: NotificationType;
  visible: boolean;
  id: number; // To trigger re-renders even with the same message
}

const initialState: NotificationState = {
  message: '',
  type: 'info',
  visible: false,
  id: 0,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    showNotification: (state, action: PayloadAction<Omit<NotificationState, 'visible' | 'id'>>) => {
      state.message = action.payload.message;
      state.description = action.payload.description;
      state.type = action.payload.type;
      state.visible = true;
      state.id = Date.now();
    },
    hideNotification: (state) => {
      state.visible = false;
    },
  },
});

export const { showNotification, hideNotification } = notificationSlice.actions;

export default notificationSlice.reducer;