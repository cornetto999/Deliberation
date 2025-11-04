import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { PanelLeft, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

const SIDEBAR_COOKIE_NAME = "sidebar";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
const SidebarContext = React.createContext(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within a <SidebarProvider />");
  }

  return context;
}

function SidebarProvider({ defaultOpen = true, open: openProp, onOpenChange, className, children, ...props }) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  // This is the internal state of the sidebar.
  // We use `openProp` if provided, otherwise we use the internal state.
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value) => {
      if (openProp === undefined) {
        _setOpen(value);
      }
      onOpenChange?.(value);
    },
    [openProp, onOpenChange],
  );

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return setOpen(!open);
  }, [setOpen, open]);

  // Adds the ability to hide the sidebar when clicking outside of it on mobile.
  React.useEffect(() => {
    if (isMobile) {
      return;
    }

    function handleOutsideClick(event) {
      if (window.innerWidth >= 1024) {
        return;
      }

      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      const trigger = document.querySelector('[data-sidebar="trigger"]');

      if (!sidebar || !trigger) {
        return;
      }

      const isClickOutside = !sidebar.contains(event.target) && !trigger.contains(event.target);

      if (isClickOutside && open) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isMobile, open, setOpen]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed";

  // Persist the sidebar state to a cookie.
  React.useEffect(() => {
    if (isMobile) {
      return;
    }

    const openState = open ? "expanded" : "collapsed";
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  }, [open, isMobile]);

  const contextValue = React.useMemo(
    () => ({
      state,
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <SidebarSideProvider side={props.side}>
          <div
            data-sidebar="provider"
            data-state={state}
            className={cn("group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar", className)}
          >
            {children}
          </div>
        </SidebarSideProvider>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

const SidebarSideContext = React.createContext({ side: "left" });

function SidebarSideProvider({ side, children }) {
  return <SidebarSideContext.Provider value={{ side }}>{children}</SidebarSideContext.Provider>;
}

function SidebarInset({ className, ...props }) {
  return (
    <aside
      ref={props.ref}
      className={cn(
        "relative flex min-h-svh flex-1 flex-col bg-background",
        "peer-data-[variant=inset]:h-[calc(100svh-theme(spacing.4))] md:data-[variant=inset]:top-2 md:data-[state=collapsed]:data-[variant=inset]:top-2 md:data-[variant=inset]:left-0 md:data-[variant=inset]:max-w-xl",
        className,
      )}
      {...props}
    />
  );
}

const SidebarInput = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      data-sidebar="input"
      className={cn(
        "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className,
      )}
      {...props}
    />
  );
});
SidebarInput.displayName = "SidebarInput";

const SidebarRail = React.forwardRef(
  ({ className, ...props }, ref) => {
    const { side } = React.useContext(SidebarSideContext);

    return (
      <div
        ref={ref}
        data-sidebar="rail"
        aria-hidden="true"
        className={cn("absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] group-data-[side=left]:-right-4 group-data-[side=right]:left-0 hover:border-sidebar-border sm:block", className)}
        {...props}
      >
        <div
          title="Toggle Sidebar"
          className={cn(
            "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] group-data-[side=left]:-right-4 group-data-[side=right]:left-0 hover:border-sidebar-border sm:block",
            "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
            "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
            "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:w-full group-data-[collapsible=offcanvas]:bg-sidebar",
            "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
            "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
          )}
        />
      </div>
    );
  },
);
SidebarRail.displayName = "SidebarRail";

function Sidebar({ side = "left", variant = "sidebar", collapsible = "offcanvas", className, children, ...props }) {
  const { isMobile } = useSidebar();

  // Mobile sidebar should always be a sheet/drawer.
  if (isMobile) {
    return (
      <Sheet open={props.open} onOpenChange={props.onOpenChange}>
        <SheetTrigger asChild>
          <div />
        </SheetTrigger>
        <SheetContent
          data-sidebar="sidebar"
          data-mobile="true"
          className="w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          style={{
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            }}
          side={side}
        >
          <div className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border-sidebar-border">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      ref={props.ref}
      className={cn(
        "group/sidebar peer/sidebar flex h-svh w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground transition-[width,height] duration-200 ease-linear",
        "data-[state=collapsed]:w-[--sidebar-width-icon]",
        variant === "floating" || variant === "inset"
          ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
          : "group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:right-0 group-data-[side=right]:left-0",
        className,
      )}
      data-sidebar="sidebar"
      data-state={useSidebar().state}
      data-variant={variant}
      data-collapsible={collapsible}
      data-side={side}
      style={{
          "--sidebar-width": SIDEBAR_WIDTH,
          "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
        }}
      {...props}
    >
      <div
        data-sidebar="sidebar"
        className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border-sidebar-border"
      >
        {children}
      </div>
    </aside>
  );
}
Sidebar.displayName = "Sidebar";

const SidebarTrigger = React.forwardRef(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

const SidebarClose = React.forwardRef(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      ref={ref}
      data-sidebar="close"
      variant="ghost"
      size="icon"
      className={cn("ml-auto h-7 w-7", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close Sidebar</span>
    </Button>
  );
});
SidebarClose.displayName = "SidebarClose";

const SidebarHeader = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn("flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-6", className)}
      {...props}
    />
  );
});
SidebarHeader.displayName = "SidebarHeader";

const SidebarFooter = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cn("flex h-16 shrink-0 items-center gap-2 border-t border-sidebar-border px-6", className)}
      {...props}
    />
  );
});
SidebarFooter.displayName = "SidebarFooter";

const SidebarContent = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
});
SidebarContent.displayName = "SidebarContent";

const SidebarGroup = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  );
});
SidebarGroup.displayName = "SidebarGroup";

const SidebarGroupLabel = React.forwardRef(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";

    return (
      <Comp
        ref={ref}
        data-sidebar="group-label"
        className={cn(
          "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opa] duration-200 ease-linear focus-visible:ring-2 [&>svg]:h-4 [&>svg]:w-0",
          "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
          className,
        )}
        {...props}
      />
    );
  },
);
SidebarGroupLabel.displayName = "SidebarGroupLabel";

const SidebarGroupAction = React.forwardRef(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        data-sidebar="group-action"
        className={cn(
          "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:h-4 [&>svg]:w-0",
          className,
        )}
        {...props}
      />
    );
  },
);
SidebarGroupAction.displayName = "SidebarGroupAction";

const SidebarGroupContent = React.forwardRef(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-sidebar="group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  ),
);
SidebarGroupContent.displayName = "SidebarGroupContent";

const SidebarMenu = React.forwardRef(({ className, ...props }, ref) => (
  <ul ref={ref} data-sidebar="menu" className={cn("flex w-full min-w-0 flex-col gap-1", className)} {...props} />
));
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = React.forwardRef(({ className, ...props }, ref) => (
  <li ref={ref} data-sidebar="menu-item" className={cn("group/menu-item relative", className)} {...props} />
));
SidebarMenuItem.displayName = "SidebarMenuItem";

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pl-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span]:child [&>svg]:h-4 [&>svg]:w-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8",
        sm: "h-7 text-xs",
        lg: "h-12 text-base group-data-[collapsible=icon]:size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const SidebarMenuButton = React.forwardRef(
  ({ asChild = false, variant = "default", size = "default", className, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
SidebarMenuButton.displayName = "SidebarMenuButton";

const SidebarMenuAction = React.forwardRef(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        data-sidebar="menu-action"
        className={cn(
          "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-data-[active=true]/menu-button:bg-sidebar-accent peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0 [&>svg]:size-4 [&>svg]:shrink-0",
          className,
        )}
        {...props}
      />
    );
  },
);
SidebarMenuAction.displayName = "SidebarMenuAction";

const SidebarMenuBadge = React.forwardRef((
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-sidebar="menu-badge"
      className={cn("ml-auto flex size-6 items-center justify-center rounded-md", className)}
      {...props}
    />
  ),
));
SidebarMenuBadge.displayName = "SidebarMenuBadge";

const SidebarMenuSkeleton = React.forwardRef(
  ({ className, showIcon = false, ...props }, ref) => {
    // Random width between 50 to 90%.
    const width = React.useMemo(() => {
      return `${Math.floor(Math.random() * 40) + 50}%`;
    }, []);

    return (
      <div
        ref={ref}
        data-sidebar="menu-skeleton"
        className={cn("rounded-md h-8 flex gap-2 px-2", className)}
        {...props}
      >
        {showIcon && <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />}
        <Skeleton
          className="h-4 max-w-[--skeleton-width] flex-1"
          data-sidebar="menu-skeleton-text"
          style={{
            "--skeleton-width": width,
          }}
        />
      </div>
    );
  },
);
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";

const SidebarMenuSub = React.forwardRef(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      data-sidebar="menu-sub"
      className={cn(
        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  ),
);
SidebarMenuSub.displayName = "SidebarMenuSub";

const SidebarMenuSubItem = React.forwardRef(({ ...props }, ref) => {
  return (
    <li>
      <SidebarMenuSubButton ref={ref} {...props} />
    </li>
  );
});
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

const SidebarMenuSubButton = React.forwardRef(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const { isMobile } = useSidebar();

    return (
      <Comp
        ref={ref}
        data-sidebar="menu-sub-button"
        className={cn(
          "flex h-7 min-w-0 -translate-x-px items-center gap-2 rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
          className,
        )}
        {...props}
      />
    );
  },
);
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

const SidebarMenuSeparator = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <li
      ref={ref}
      data-sidebar="menu-separator"
      role="separator"
      className={cn("my-2 h-px w-full bg-sidebar-border", className)}
      {...props}
    />
  );
});
SidebarMenuSeparator.displayName = "SidebarMenuSeparator";

export {
  Sidebar,
  SidebarClose,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSeparator,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
};
