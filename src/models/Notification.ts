import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export enum NotificationType {
  PROJECT_INVITATION = 'project_invitation',
  TASK_ASSIGNMENT = 'task_assignment',
  TASK_UPDATE = 'task_update',
  TASK_COMMENT = 'task_comment'
}

export interface INotification extends Document {
  user: IUser['_id'];
  type: NotificationType;
  message: string;
  read: boolean;
  relatedProject?: string;
  relatedTask?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true
    },
    message: {
      type: String,
      required: true
    },
    read: {
      type: Boolean,
      default: false
    },
    relatedProject: {
      type: Schema.Types.ObjectId,
      ref: 'Project'
    },
    relatedTask: {
      type: Schema.Types.ObjectId,
      ref: 'Task'
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<INotification>('Notification', notificationSchema); 