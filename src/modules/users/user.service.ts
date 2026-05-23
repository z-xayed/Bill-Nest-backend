import { IUser } from './user.interface';
import { User } from './user.model';

export const createUser = async (payload: Partial<IUser>): Promise<IUser> => {
  return User.create(payload);
};

export const findUserByEmail = async (email: string): Promise<IUser | null> => {
  return User.findOne({ email: email.toLowerCase() });
};

export const findUserById = async (userId: string): Promise<IUser | null> => {
  return User.findById(userId);
};
