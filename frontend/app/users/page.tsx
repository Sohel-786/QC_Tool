"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Role } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit2, Search, Trash2, Users, Shield, Check } from "lucide-react";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "@/hooks/use-users";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AVATAR_OPTIONS, DEFAULT_AVATAR_PATH } from "@/lib/avatar-options";

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z
    .string()
    .refine((val) => !val || val.length === 0 || val.length >= 6, {
      message: "Password must be at least 6 characters",
    })
    .optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.nativeEnum(Role),
  isActive: z.boolean().optional(),
  avatar: z.string().nullable().optional(),
});

type UserForm = z.infer<typeof userSchema>;

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser, loading: userLoading } = useCurrentUser();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const { data: users } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  // All hooks must be called before any conditional returns
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      role: Role.QC_USER,
      isActive: true,
      avatar: null as string | null,
    },
    mode: "onChange", // Validate on change for real-time feedback
    shouldUnregister: true, // Unregister fields when component unmounts
  });

  // Watch username for real-time validation
  const watchedUsername = watch("username");

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isFormOpen) {
      // Reset form when dialog closes
      reset(
        {
          username: "",
          password: "",
          firstName: "",
          lastName: "",
          role: Role.QC_USER,
          isActive: true,
          avatar: null,
        },
        { keepDefaultValues: false },
      );
    } else if (isFormOpen && !editingUser) {
      // Ensure form is empty when opening for new user
      setTimeout(() => {
        reset(
          {
            username: "",
            password: "",
            firstName: "",
            lastName: "",
            role: Role.QC_USER,
            isActive: true,
            avatar: null,
          },
          { keepDefaultValues: false },
        );
      }, 10);
    }
  }, [isFormOpen, editingUser, reset]);

  // Route protection - only admins can access (user management is admin-only)
  useEffect(() => {
    if (!userLoading && currentUser) {
      if (currentUser.role !== Role.QC_ADMIN) {
        router.push("/dashboard");
      }
    }
  }, [currentUser, userLoading, router]);

  // Show loading state
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized message if not admin
  if (currentUser && currentUser.role !== Role.QC_ADMIN) {
    return null; // Will redirect in useEffect
  }

  const handleOpenForm = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setIsFormOpen(true);
      // Reset form with user data after dialog opens
      setTimeout(() => {
        reset(
          {
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
            avatar: user.avatar ?? null,
            password: "", // Don't set password for editing
          },
          { keepDefaultValues: false },
        );
      }, 50);
    } else {
      setEditingUser(null);
      setIsFormOpen(true);
      // Form will be reset by useEffect when isFormOpen becomes true
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
    reset({
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      role: Role.QC_USER,
      isActive: true,
      avatar: null,
    });
  };

  const onSubmit = (data: UserForm) => {
    if (editingUser) {
      // For updates, only send password if it's provided
      const updateData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        isActive: data.isActive,
      };
      if (data.password && data.password.trim().length > 0) {
        updateData.password = data.password;
      }
      updateUser.mutate(
        { id: editingUser.id, data: updateData },
        {
          onSuccess: () => {
            handleCloseForm();
          },
        },
      );
    } else {
      // For new users, password is required
      const password = data.password?.trim() || "";
      if (password.length === 0) {
        setValue("password", "", { shouldValidate: true });
        return;
      }
      if (password.length < 6) {
        setValue("password", password, { shouldValidate: true });
        return;
      }
      const createData = {
        username: data.username,
        password: password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        isActive: data.isActive ?? true,
        avatar: data.avatar ?? null,
      };
      createUser.mutate(createData, {
        onSuccess: () => {
          handleCloseForm();
        },
      });
    }
  };

  const handleDeleteClick = (user: User) => {
    // Prevent deleting own account
    if (currentUser && user.id === currentUser.id) {
      return;
    }
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteUser.mutate(userToDelete.id, {
        onSuccess: () => {
          setDeleteConfirmOpen(false);
          setUserToDelete(null);
        },
      });
    }
  };

  const filteredUsers =
    users?.filter(
      (user) =>
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <Users className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-text mb-1">
                  User Accounts
                </h1>
                <p className="text-secondary-600 flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>
                    Admin-only access • Manage system users and permissions
                  </span>
                </p>
              </div>
            </div>
            <Button
              onClick={() => handleOpenForm()}
              className="shadow-md bg-primary-600 hover:bg-primary-700"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add New User
            </Button>
          </div>

          {/* Search */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
                <Input
                  placeholder="Search users by name or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card className="shadow-md border-0">
            <CardHeader className="bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-text">
                  All Users
                </CardTitle>
                <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-primary-700 border border-primary-200">
                  {filteredUsers.length}{" "}
                  {filteredUsers.length === 1 ? "user" : "users"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {filteredUsers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredUsers.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-6 border-2 border-secondary-200 rounded-xl hover:border-primary-300 hover:shadow-xl transition-all bg-white group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-20 h-20 bg-primary-50 rounded-bl-full opacity-50"></div>
                      {currentUser && user.id === currentUser.id && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                          You
                        </div>
                      )}
                      <div className="relative">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-md ring-2 ring-white">
                                {user.avatar ? (
                                  <img
                                    src={`/assets/avatar/${user.avatar}`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const el = e.target as HTMLImageElement;
                                      el.style.display = "none";
                                      el.nextElementSibling?.classList.remove("hidden");
                                    }}
                                  />
                                ) : null}
                                <span className={user.avatar ? "hidden absolute inset-0 flex items-center justify-center" : ""}>
                                  {user.firstName?.[0]}
                                  {user.lastName?.[0]}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-bold text-lg text-text">
                                  {user.firstName} {user.lastName}
                                  {currentUser &&
                                    user.id === currentUser.id && (
                                      <span className="ml-2 text-xs text-blue-600 font-normal">
                                        (Your Account)
                                      </span>
                                    )}
                                </h3>
                                <p className="text-sm text-secondary-500 font-mono">
                                  {user.username}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 mb-3">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  user.role === Role.QC_ADMIN
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : user.role === Role.QC_MANAGER
                                      ? "bg-purple-100 text-purple-700 border border-purple-200"
                                      : "bg-blue-100 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {user.role === Role.QC_ADMIN
                                  ? "Admin"
                                  : user.role === Role.QC_MANAGER
                                    ? "Manager"
                                    : "User"}
                              </span>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  user.isActive
                                    ? "bg-green-100 text-green-700 border border-green-200"
                                    : "bg-red-100 text-red-700 border border-red-200"
                                }`}
                              >
                                {user.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenForm(user)}
                              className="hover:bg-primary-50 hover:text-primary-600"
                              title="Edit user"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            {currentUser && user.id === currentUser.id ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled
                                className="text-secondary-400 cursor-not-allowed"
                                title="You cannot delete your own account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(user)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Users className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                  <p className="text-secondary-500 text-lg font-medium">
                    {searchTerm
                      ? "No users found matching your search."
                      : "No users found. Add your first user above."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Form Dialog */}
        <Dialog
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title={editingUser ? "Update User" : "Add New User"}
          size="lg"
        >
          <form
            key={`${editingUser?.id || "new"}-${isFormOpen}`}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  {...register("firstName")}
                  className="mt-1"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  {...register("lastName")}
                  className="mt-1"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                type="text"
                {...register("username", {
                  validate: (value) => {
                    if (!value || value.trim().length === 0) {
                      return "Username is required";
                    }
                    if (value.length < 3) {
                      return "Username must be at least 3 characters";
                    }
                    // Check if username already exists (only for new users)
                    if (!editingUser && users) {
                      const usernameExists = users.some(
                        (user) =>
                          user.username.toLowerCase() ===
                          value.toLowerCase().trim(),
                      );
                      if (usernameExists) {
                        return "This username is already taken. Please choose another.";
                      }
                    }
                    // For editing, check if username exists for other users
                    if (editingUser && users) {
                      const usernameExists = users.some(
                        (user) =>
                          user.id !== editingUser.id &&
                          user.username.toLowerCase() ===
                            value.toLowerCase().trim(),
                      );
                      if (usernameExists) {
                        return "This username is already taken. Please choose another.";
                      }
                    }
                    return true;
                  },
                })}
                disabled={!!editingUser}
                className="mt-1"
                placeholder="Enter a unique username"
                key={`username-${editingUser?.id || "new"}-${isFormOpen}`}
              />
              {errors.username && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.username.message}
                </p>
              )}
              {!errors.username &&
                watchedUsername &&
                !editingUser &&
                users &&
                (() => {
                  const usernameExists = users.some(
                    (user) =>
                      user.username.toLowerCase() ===
                      watchedUsername.toLowerCase().trim(),
                  );
                  return usernameExists ? (
                    <p className="text-sm text-red-600 mt-1">
                      This username is already taken. Please choose another.
                    </p>
                  ) : watchedUsername.length >= 3 ? (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ Username is available
                    </p>
                  ) : null;
                })()}
            </div>
            <div>
              <Label htmlFor="password">
                Password {editingUser ? "(Leave empty to keep current)" : "*"}
              </Label>
              <Input
                id="password"
                type="password"
                {...register("password", {
                  required: !editingUser ? "Password is required" : false,
                  minLength: editingUser
                    ? undefined
                    : {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                })}
                className="mt-1"
                placeholder={
                  editingUser
                    ? "Leave empty to keep current password"
                    : "Enter a password (min 6 characters)"
                }
                key={`password-${editingUser?.id || "new"}-${isFormOpen}`}
              />
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select id="role" {...register("role")} className="mt-1">
                <option value={Role.QC_USER}>User</option>
                <option value={Role.QC_MANAGER}>Manager</option>
                <option value={Role.QC_ADMIN}>Admin</option>
              </Select>
            </div>

            {/* Avatar selection – below Role; row layout, 30px each, from /assets/avatar/ and default /assets/avatar.jpg */}
            <div className="space-y-2">
              <Label className="text-base font-semibold text-primary-900">Avatar</Label>
              <p className="text-sm text-primary-700/80">
                Choose an avatar for this user. It will appear in the header and user list.
              </p>
              <div className="flex flex-row flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setValue("avatar", null, { shouldValidate: true })}
                  className={`relative w-[30px] h-[30px] rounded-full overflow-hidden flex-shrink-0 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    !watch("avatar")
                      ? "scale-[1.05] ring-2 ring-primary-500 ring-offset-2 ring-offset-white shadow-sm"
                      : "border border-secondary-200 hover:border-primary-300"
                  }`}
                  title="Default avatar"
                >
                  <img
                    src={DEFAULT_AVATAR_PATH}
                    alt="Default"
                    className="w-full h-full object-cover"
                  />
                </button>
                {AVATAR_OPTIONS.map((filename) => {
                  const isSelected = watch("avatar") === filename;
                  return (
                    <button
                      key={filename}
                      type="button"
                      onClick={() => setValue("avatar", filename, { shouldValidate: true })}
                      className={`relative w-[30px] h-[30px] rounded-full overflow-hidden flex-shrink-0 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                        isSelected
                          ? "scale-[1.05] ring-2 ring-primary-500 ring-offset-2 ring-offset-white shadow-sm"
                          : "border border-secondary-200 hover:border-primary-300"
                      }`}
                      title={filename}
                    >
                      <img
                        src={`/assets/avatar/${filename}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {editingUser && (
              <div>
                <Label
                  htmlFor="isActive"
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    id="isActive"
                    {...register("isActive")}
                    className="rounded w-4 h-4 text-primary-600 focus:ring-primary-500 border-secondary-300"
                  />
                  <span>Active</span>
                </Label>
              </div>
            )}
            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={createUser.isPending || updateUser.isPending}
                className="flex-1"
              >
                {createUser.isPending || updateUser.isPending
                  ? "Saving..."
                  : editingUser
                    ? "Update User"
                    : "Create User"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseForm}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        {deleteConfirmOpen && userToDelete && (
          <Dialog
            isOpen={deleteConfirmOpen}
            onClose={() => {
              setDeleteConfirmOpen(false);
              setUserToDelete(null);
            }}
            title="Delete User"
            size="sm"
          >
            <div className="space-y-4">
              {currentUser && userToDelete.id === currentUser.id ? (
                <>
                  <p className="text-secondary-600">
                    You cannot delete your own account.
                  </p>
                  <p className="text-sm text-red-600">
                    For security reasons, managers cannot delete their own
                    profile. Please contact a system administrator if you need
                    to remove your account.
                  </p>
                  <div className="flex space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDeleteConfirmOpen(false);
                        setUserToDelete(null);
                      }}
                      className="flex-1"
                    >
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-secondary-600">
                    Are you sure you want to delete{" "}
                    <strong>
                      {userToDelete.firstName} {userToDelete.lastName}
                    </strong>
                    ?
                  </p>
                  <p className="text-sm text-red-600">
                    Note: Users who have been used in transactions (issues,
                    returns, or audit logs) cannot be deleted.
                  </p>
                  <div className="flex space-x-3 pt-4">
                    <Button
                      variant="destructive"
                      onClick={handleDeleteConfirm}
                      disabled={deleteUser.isPending}
                      className="flex-1"
                    >
                      {deleteUser.isPending ? "Deleting..." : "Delete"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDeleteConfirmOpen(false);
                        setUserToDelete(null);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Dialog>
        )}
      </motion.div>
    </div>
  );
}
