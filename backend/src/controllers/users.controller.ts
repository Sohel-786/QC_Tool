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

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    const user = await User.findById(userId);
    if (!user) {
      return next(new NotFoundError(`User with ID ${id} not found`));
    }

    // Check if user has been used in any transactions
    // Check if user has issued any tools
    const issuedCount = await prisma.issue.count({
      where: { issuedBy: userId },
    });

    // Check if user has returned any tools
    const returnedCount = await prisma.return.count({
      where: { returnedBy: userId },
    });

    // Check if user has audit logs
    const auditLogCount = await prisma.auditLog.count({
      where: { userId: userId },
    });

    if (issuedCount > 0 || returnedCount > 0 || auditLogCount > 0) {
      return next(
        new ValidationError(
          'Cannot delete user. This user has been used in transactions (issues, returns, or audit logs).'
        )
      );
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    next(error);
  }
};
