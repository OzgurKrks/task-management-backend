import mongoose, { Document, Schema } from 'mongoose';
import { IUser, UserRole } from './User';

export enum ProjectMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member'
}

export interface ProjectMember {
  user: IUser['_id'];
  role: ProjectMemberRole;
}

export interface IProject extends Document {
  name: string;
  description: string;
  owner: IUser['_id'];
  members: IUser['_id'][];
  memberRoles: Map<string, ProjectMemberRole>;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    memberRoles: {
      type: Map,
      of: String,
      default: new Map()
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IProject>('Project', projectSchema); 