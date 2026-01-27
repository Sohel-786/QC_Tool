import { Request, Response, NextFunction } from 'express';
import User from '../entities/user';
import { hashPassword } from '../utils/auth';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, firstName, lastName, role, isActive } = req.body;
    const createdBy = req.user?.id;

    if (!username || !password || !firstName || !lastName || !role) {
      return next(new ValidationError('All required fields must be provided'));
    }

    const usernameExists = await User.usernameExists(username);
    if (usernameExists) {
      return next(new ConflictError('User with this username already exists'));
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      username,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      isActive: isActive !== undefined ? isActive : true,
      createdBy,
    });

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.findAll();
    res.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await User.findById(parseInt(id));

    if (!user) {
      return next(new NotFoundError(`User with ID ${id} not found`));
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { username, password, firstName, lastName, role, isActive } = req.body;

    const user = await User.findById(parseInt(id));
    if (!user) {
      return next(new NotFoundError(`User with ID ${id} not found`));
    }

    const updateData: any = {};
    if (username && username !== user.username) {
      const usernameExists = await User.usernameExists(username);
      if (usernameExists) {
        return next(new ConflictError('User with this username already exists'));
      }
      updateData.username = username;
    }
    if (password) {
      updateData.password = await hashPassword(password);
    }
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await User.update(parseInt(id), updateData);

    res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error: any) {
    next(error);
  }
};

export const deactivateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await User.findById(parseInt(id));

    if (!user) {
      return next(new NotFoundError(`User with ID ${id} not found`));
    }

    const updatedUser = await User.update(parseInt(id), { isActive: false });

    res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error: any) {
    next(error);
  }
};
