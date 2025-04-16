import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { ITask, TaskStatus, TaskPriority } from './Task';

export interface ITaskLog extends Document {
  task: ITask['_id'];
  user: IUser['_id'];
  previousStatus?: TaskStatus;
  newStatus?: TaskStatus;
  previousPriority?: TaskPriority;
  newPriority?: TaskPriority;
  previousAssignee?: IUser['_id'];
  newAssignee?: IUser['_id'];
  message: string;
  createdAt: Date;
}

const taskLogSchema = new Schema<ITaskLog>(
  {
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    previousStatus: {
      type: String,
      enum: Object.values(TaskStatus)
    },
    newStatus: {
      type: String,
      enum: Object.values(TaskStatus)
    },
    previousPriority: {
      type: String,
      enum: Object.values(TaskPriority)
    },
    newPriority: {
      type: String,
      enum: Object.values(TaskPriority)
    },
    previousAssignee: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    newAssignee: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    message: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<ITaskLog>('TaskLog', taskLogSchema); 