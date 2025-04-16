import { Request, Response } from 'express';
import User, { UserRole } from '../models/User';
import mongoose from 'mongoose';

// @desc    Get all users (except admin/current user for regular users, all for admins)
// @route   GET /api/users
// @access  Private
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    let users;
    
    if (req.user.role === UserRole.ADMIN) {
      // Admins can see all users
      users = await User.find().select('-password');
    } else {
      // Regular users can see other users but not admins
      users = await User.find({ 
        _id: { $ne: req.user._id },
        role: { $ne: UserRole.ADMIN }
      }).select('-password');
    }
    
    res.json(users);
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get users for project member selection (excludes project owner and current members)
// @route   GET /api/users/available-for-project/:projectId
// @access  Private
export const getUsersForProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    
    // Validate project ID
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      res.status(400).json({ message: 'Invalid project ID' });
      return;
    }
    
    // Find project to get owner and current members
    const Project = mongoose.model('Project');
    const project = await Project.findById(projectId);
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    // Check if user is authorized to view this data (project owner, member, or admin)
    const isProjectMember = project.members.some(
      (member: mongoose.Types.ObjectId) => member.toString() === req.user._id.toString()
    );
    const isProjectOwner = project.owner.toString() === req.user._id.toString();
    
    if (req.user.role !== UserRole.ADMIN && !isProjectMember && !isProjectOwner) {
      res.status(403).json({ message: 'Not authorized to access this project' });
      return;
    }
    
    // Extract current member IDs
    const memberIds = project.members.map((id: mongoose.Types.ObjectId) => id.toString());
    const ownerId = project.owner.toString();
    
    // Find all users who are not already members and not the owner
    const availableUsers = await User.find({
      _id: { 
        $nin: [...memberIds],
        $ne: ownerId 
      }
    }).select('_id name email role');
    
    res.json(availableUsers);
  } catch (error: any) {
    console.error('Get users for project error:', error);
    res.status(500).json({ message: error.message });
  }
}; 