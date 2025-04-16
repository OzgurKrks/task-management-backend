import { Request, Response } from 'express';
import Notification from '../models/Notification';
import mongoose from 'mongoose';

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('relatedProject', 'name')
      .populate('relatedTask', 'title');
    
    // Count unread notifications
    const unreadCount = await Notification.countDocuments({ 
      user: req.user._id,
      read: false
    });
    
    res.json({
      notifications,
      unreadCount
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const notificationId = req.params.id;
    
    // Validate notification ID
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      res.status(400).json({ message: 'Invalid notification ID' });
      return;
    }
    
    // Find notification and ensure it belongs to current user
    const notification = await Notification.findOne({
      _id: notificationId,
      user: req.user._id
    });
    
    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }
    
    // Mark as read
    notification.read = true;
    await notification.save();
    
    res.json({ message: 'Notification marked as read', notification });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllNotificationsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    // Update all unread notifications for current user
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a notification
// @route   [Internal function - not exposed as API]
// @access  Internal
export const createNotification = async (data: {
  userId: string;
  type: string;
  message: string;
  relatedProject?: string;
  relatedTask?: string;
}): Promise<void> => {
  try {
    await Notification.create({
      user: data.userId,
      type: data.type,
      message: data.message,
      relatedProject: data.relatedProject,
      relatedTask: data.relatedTask,
      read: false
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}; 