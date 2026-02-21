// src/admin/users/components/UsersTable.tsx
import { AdminUserRow } from "../hooks/useAdminUsersData";

type Props = {
  users: AdminUserRow[];
  onSuspend: (id: string) => void;
  onReactivate: (id: string) => void;
};

export default function UsersTable({ users, onSuspend, onReactivate }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
      <table className="w-full text-sm">
        <thead className="text-white/50 uppercase text-xs">
          <tr>
            <th className="p-4 text-left">Email</th>
            <th className="p-4 text-left">Role</th>
            <th className="p-4 text-left">Status</th>
            <th className="p-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const suspended = !!u.disabled_at;

            return (
              <tr key={u.id} className="border-t border-white/10">
                <td className="p-4">
                  <div className="font-medium">{u.email}</div>
                  {u.must_change_password && (
                    <span className="text-yellow-400 text-xs">
                      Must change password
                    </span>
                  )}
                </td>

                <td className="p-4">
                  <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs">
                    {u.app_role}
                  </span>
                </td>

                <td className="p-4">
                  {suspended ? (
                    <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                      SUSPENDED
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                      ACTIVE
                    </span>
                  )}
                </td>

                <td className="p-4 text-right">
                  {suspended ? (
                    <button
                      onClick={() => onReactivate(u.id)}
                      className="text-green-400 hover:text-green-300 transition"
                    >
                      Reactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => onSuspend(u.id)}
                      className="text-red-400 hover:text-red-300 transition"
                    >
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}