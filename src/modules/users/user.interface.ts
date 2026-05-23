
export type UserRole = "admin" | "client";
export type UserStatus = "active" | "blocked" | "deleted";

export interface IUser {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    status: UserStatus;
    isEmailVerified: boolean;
    stripeCustomerId?: string;
    lastLoginAt?: Date;
    passwordChangedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export type IUserRole = UserRole;
export type IUserStatus = UserStatus;
