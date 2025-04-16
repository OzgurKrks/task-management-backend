import { Request, Response } from 'express';
import Project, { IProject, ProjectMemberRole } from '../models/Project';
import { UserRole } from '../models/User';
import mongoose from 'mongoose';
import { emitProjectUpdated, emitProjectDeleted } from '../utils/socketEvents';
import User from '../models/User';

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    
    const project = await Project.create({
      name,
      description,
      owner: req.user._id,
      members: [req.user._id]
    });
    
    // Set the creator as an owner in memberRoles
    project.memberRoles.set(req.user._id.toString(), ProjectMemberRole.OWNER);
    await project.save();
    
    res.status(201).json(project);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all projects accessible by the user
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    // Projects should only be shown to their owner and members
    // Query to find projects where the user is either the owner or a member
    const query = {
      $or: [
        { owner: req.user._id },
        { members: { $in: [req.user._id] } }
      ]
    };
    
    const projects = await Project.find(query)
      .populate('owner', 'name email')
      .populate('members', 'name email');
    
    // Transform memberRoles Map to array for easier frontend consumption
    const transformedProjects = projects.map(project => {
      const projectObj = project.toObject();
      const memberRolesMap = project.memberRoles;
      
      // Convert Map to object with user IDs as keys
      const memberRoles: Record<string, string> = {};
      memberRolesMap.forEach((role, userId) => {
        memberRoles[userId] = role;
      });
      
      return {
        ...projectObj,
        memberRoles
      };
    });
    
    res.json(transformedProjects);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a project by ID
// @route   GET /api/projects/:id
// @access  Private
export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email') as (IProject & { 
        owner: { _id: mongoose.Types.ObjectId; toString(): string } 
      });
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    // Check if user is authorized to view this project
    const isProjectMember = project.members.some(
      (member: any) => member._id.toString() === req.user._id.toString()
    );
    const isProjectOwner = project.owner._id 
      ? project.owner._id.toString() === req.user._id.toString()
      : project.owner.toString() === req.user._id.toString();
    
    if (req.user.role !== UserRole.ADMIN && !isProjectMember && !isProjectOwner) {
      res.status(403).json({ message: 'Not authorized to access this project' });
      return;
    }
    
    // Transform memberRoles Map to object for easier frontend consumption
    const projectObj = project.toObject();
    const memberRolesMap = project.memberRoles;
    
    // Convert Map to object with user IDs as keys
    const memberRoles: Record<string, string> = {};
    memberRolesMap.forEach((role, userId) => {
      memberRoles[userId] = role;
    });
    
    res.json({
      ...projectObj,
      memberRoles
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a project
// @route   PUT /api/projects/:id
// @access  Private (Project Owner or Admin)
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, members } = req.body;
    
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    // Check if user is authorized to update this project (owner or admin)
    const ownerId = (project.owner as unknown as mongoose.Types.ObjectId).toString();
    const isProjectOwner = ownerId === req.user._id.toString();
    
    if (req.user.role !== UserRole.ADMIN && !isProjectOwner) {
      res.status(403).json({ message: 'Not authorized to update this project' });
      return;
    }
    
    // Update project fields
    project.name = name || project.name;
    project.description = description || project.description;
    
    if (members) {
      project.members = members;
      // Ensure owner is always a member
      if (!project.members.includes(project.owner)) {
        project.members.push(project.owner);
      }
    }
    
    const updatedProject = await project.save();
    
    // Emit WebSocket event for project update
    emitProjectUpdated(updatedProject as IProject);
    
    res.json(updatedProject);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private (Project Owner or Admin)
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    // Check if user is authorized to delete this project (owner or admin)
    const ownerId = (project.owner as unknown as mongoose.Types.ObjectId).toString();
    const isProjectOwner = ownerId === req.user._id.toString();
    
    if (req.user.role !== UserRole.ADMIN && !isProjectOwner) {
      res.status(403).json({ message: 'Not authorized to delete this project' });
      return;
    }
    
    const projectId = (project._id as mongoose.Types.ObjectId).toString();
    await project.deleteOne();
    
    // Emit WebSocket event for project deletion
    emitProjectDeleted(projectId);
    
    res.json({ message: 'Project removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a member to a project
// @route   POST /api/projects/:id/members
// @access  Private (Project Owner or Admin)
export const addProjectMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.body;
    const projectId = req.params.id;
    
    // Validate project ID
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      res.status(400).json({ message: 'Invalid project ID' });
      return;
    }
    
    // Validate user ID
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ message: 'Valid userId is required' });
      return;
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // Find the project
    const project = await Project.findById(projectId) as IProject;
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    // Check if user is authorized to add members 
    // Only Owner can add ADMIN roles, ADMIN can add regular MEMBER roles
    const ownerId = (project.owner as unknown as mongoose.Types.ObjectId).toString();
    const isProjectOwner = ownerId === req.user._id.toString();
    const currentUserRole = req.user.role;
    const currentUserProjectRole = project.memberRoles.get(req.user._id.toString());
    
    // Default role for new members
    const memberRole = role || ProjectMemberRole.MEMBER;
    
    // Check if the current user can assign the requested role
    if (memberRole === ProjectMemberRole.ADMIN || memberRole === ProjectMemberRole.OWNER) {
      // Only the project owner or system admin can assign ADMIN/OWNER roles
      if (!isProjectOwner && currentUserRole !== UserRole.ADMIN) {
        res.status(403).json({ 
          message: 'Not authorized to assign admin roles to project members' 
        });
        return;
      }
    } else if (memberRole === ProjectMemberRole.MEMBER) {
      // ADMIN or OWNER can assign regular MEMBER roles
      const isProjectAdmin = currentUserProjectRole === ProjectMemberRole.ADMIN;
      if (!isProjectOwner && currentUserRole !== UserRole.ADMIN && !isProjectAdmin) {
        res.status(403).json({ 
          message: 'Not authorized to add members to this project' 
        });
        return;
      }
    }
    
    // Check if user is already a member
    const memberIds = project.members as mongoose.Types.ObjectId[];
    const isMember = memberIds.some(memberId => 
      memberId.toString() === userId
    );
    
    if (isMember) {
      // If member exists but role is changing, just update the role
      if (project.memberRoles.get(userId) !== memberRole) {
        project.memberRoles.set(userId, memberRole);
        const updatedProject = await project.save();
        
        // Emit WebSocket event for project update
        emitProjectUpdated(updatedProject);
        
        // Create notification for role change
        const { createNotification } = await import('../controllers/notificationController');
        await createNotification({
          userId,
          type: 'project_invitation',
          message: `Your role in project "${project.name}" has been updated to ${memberRole}`,
          relatedProject: projectId
        });
        
        const populatedProject = await Project.findById(projectId)
          .populate('owner', 'name email')
          .populate('members', 'name email');
          
        res.status(200).json(populatedProject);
        return;
      } else {
        res.status(400).json({ message: 'User is already a member of this project with the same role' });
        return;
      }
    }
    
    // Add user to members array
    project.members.push(userId);
    // Set member role
    project.memberRoles.set(userId, memberRole);
    const updatedProject = await project.save();
    
    // Emit WebSocket event for project update
    emitProjectUpdated(updatedProject);
    
    // Create notification for the user being added
    const { createNotification } = await import('../controllers/notificationController');
    await createNotification({
      userId,
      type: 'project_invitation',
      message: `You have been added to project: ${project.name}`,
      relatedProject: projectId
    });
    
    // Populate and return the updated project
    const populatedProject = await Project.findById(projectId)
      .populate('owner', 'name email')
      .populate('members', 'name email');
    
    res.status(200).json(populatedProject);
  } catch (error: any) {
    console.error('Add project member error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove a member from a project
// @route   DELETE /api/projects/:id/members/:memberId
// @access  Private (Project Owner or Admin)
export const removeProjectMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: projectId, memberId } = req.params;
    
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(memberId)) {
      res.status(400).json({ message: 'Invalid project ID or member ID' });
      return;
    }
    
    // Find the project
    const project = await Project.findById(projectId) as IProject;
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    // Check if user is authorized to remove members (owner or admin)
    const ownerId = (project.owner as unknown as mongoose.Types.ObjectId).toString();
    const isProjectOwner = ownerId === req.user._id.toString();
    
    if (req.user.role !== UserRole.ADMIN && !isProjectOwner) {
      res.status(403).json({ message: 'Not authorized to remove members from this project' });
      return;
    }
    
    // Cannot remove the owner from members
    if (ownerId === memberId) {
      res.status(400).json({ message: 'Cannot remove project owner from members' });
      return;
    }
    
    // Check if user is actually a member
    const memberIds = project.members as mongoose.Types.ObjectId[];
    const memberIndex = memberIds.findIndex(member => 
      member.toString() === memberId
    );
    
    if (memberIndex === -1) {
      res.status(404).json({ message: 'User is not a member of this project' });
      return;
    }
    
    // Remove member
    project.members.splice(memberIndex, 1);
    const updatedProject = await project.save();
    
    // Emit WebSocket event for project update
    emitProjectUpdated(updatedProject);
    
    // Populate and return the updated project
    const populatedProject = await Project.findById(projectId)
      .populate('owner', 'name email')
      .populate('members', 'name email');
    
    res.status(200).json(populatedProject);
  } catch (error: any) {
    console.error('Remove project member error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all members of a project
// @route   GET /api/projects/:id/members
// @access  Private (Project Members, Owner, or Admin)
export const getProjectMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id;
    
    // Validate project ID
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      res.status(400).json({ message: 'Invalid project ID' });
      return;
    }
    
    // Find the project with populated members
    const project = await Project.findById(projectId)
      .populate('members', 'name email role')
      .populate('owner', 'name email role') as (IProject & { 
        members: Array<{ _id: mongoose.Types.ObjectId; name: string; email: string; role: string }>;
        owner: { _id: mongoose.Types.ObjectId; name: string; email: string; role: string };
      });
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    // Check if user is authorized to view members
    const isProjectMember = project.members.some(
      (member: { _id: mongoose.Types.ObjectId }) => member._id.toString() === req.user._id.toString()
    );
    const isProjectOwner = project.owner._id.toString() === req.user._id.toString();
    
    if (req.user.role !== UserRole.ADMIN && !isProjectMember && !isProjectOwner) {
      res.status(403).json({ message: 'Not authorized to view members of this project' });
      return;
    }
    
    // Filter out the owner from the members list
    const membersWithoutOwner = project.members.filter(
      (member: { _id: mongoose.Types.ObjectId }) => 
        member._id.toString() !== project.owner._id.toString()
    );
    
    // Return members array without owner
    res.status(200).json(membersWithoutOwner);
  } catch (error: any) {
    console.error('Get project members error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search projects by name or description
// @route   GET /api/projects/search
// @access  Private
export const searchProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const searchQuery = req.query.q as string;
    
    if (!searchQuery) {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }
    
    let query: any = {
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ]
    };
    
    // Admin can see all projects
    if (req.user.role !== UserRole.ADMIN) {
      // For non-admin, only show projects they are a member of or own
      query = {
        $and: [
          query,
          {
            $or: [
              { owner: req.user._id },
              { members: { $in: [req.user._id] } }
            ]
          }
        ]
      };
    }
    
    const projects = await Project.find(query)
      .populate('owner', 'name email')
      .populate('members', 'name email');
    
    // Transform memberRoles Map to array for easier frontend consumption
    const transformedProjects = projects.map(project => {
      const projectObj = project.toObject();
      const memberRolesMap = project.memberRoles;
      
      // Convert Map to object with user IDs as keys
      const memberRoles: Record<string, string> = {};
      memberRolesMap.forEach((role, userId) => {
        memberRoles[userId] = role;
      });
      
      return {
        ...projectObj,
        memberRoles
      };
    });
    
    res.json(transformedProjects);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}; 