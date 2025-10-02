import { NavLink, Outlet } from "react-router-dom";
import { AuthButton } from "../AuthButton";
import { cn } from "@/lib/utils";

export function MainLayout() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <NavLink
            to="/"
            className={({ isActive }) =>
              cn(
                "transition-colors hover:text-foreground",
                isActive ? "text-foreground" : "text-muted-foreground"
              )
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/vault"
            className={({ isActive }) =>
              cn(
                "transition-colors hover:text-foreground",
                isActive ? "text-foreground" : "text-muted-foreground"
              )
            }
          >
            Data Vault
          </NavLink>
          <NavLink
            to="/documents/new"
            className={({ isActive }) =>
              cn(
                "transition-colors hover:text-foreground",
                isActive ? "text-foreground" : "text-muted-foreground"
              )
            }
          >
            Upload Document
          </NavLink>
          <NavLink
            to="/documents/generate"
            className={({ isActive }) =>
              cn(
                "transition-colors hover:text-foreground",
                isActive ? "text-foreground" : "text-muted-foreground"
              )
            }
          >
            Generate Document
          </NavLink>
                    <NavLink
            to="/negotiations"
            className={({ isActive }) =>
              cn(
                'transition-colors hover:text-foreground',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )
            }
          >
            Negotiations
          </NavLink>

          <NavLink to="/profile"
            className={({ isActive }) =>
              cn(
                'transition-colors hover:text-foreground',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )
            }
          >
            Profile
          </NavLink>
        </nav>
        <div className="ml-auto">
          <AuthButton />
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Outlet /> {/* Child routes will render here */}
      </main>
    </div>
  );
}
