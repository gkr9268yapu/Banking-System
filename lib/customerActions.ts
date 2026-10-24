// The admin actions on a customer and which status each one is allowed from.
// This file has no database code, so both the server (API) and the browser
// (the buttons) can import it and always agree on the rules.

export type CustomerStatus = "ACTIVE" | "BLOCKED" | "DEACTIVATED" | "DELETED";

// These names are also what is written to admin_audit_log.action.
export type ActionName =
    | "BLOCK_USER"
    | "UNBLOCK_USER"
    | "DEACTIVATE_USER"
    | "REACTIVATE_USER"
    | "DELETE_USER";

type ActionRule = {
    label: string; // text on the button
    from: CustomerStatus[]; // statuses the action may start from
    to: CustomerStatus; // the new users.status
    danger: boolean; // shown in red
    verb: string; // used in the confirmation question and in messages
};

// Order here is the order of the buttons on screen.
export const ACTIONS: Record<ActionName, ActionRule> = {
    BLOCK_USER: {
        label: "Block",
        from: ["ACTIVE", "DEACTIVATED"],
        to: "BLOCKED",
        danger: false,
        verb: "block",
    },
    UNBLOCK_USER: {
        label: "Unblock",
        from: ["BLOCKED"],
        to: "ACTIVE",
        danger: false,
        verb: "unblock",
    },
    DEACTIVATE_USER: {
        label: "Deactivate",
        from: ["ACTIVE"],
        to: "DEACTIVATED",
        danger: false,
        verb: "deactivate",
    },
    REACTIVATE_USER: {
        label: "Reactivate",
        from: ["DEACTIVATED"],
        to: "ACTIVE",
        danger: false,
        verb: "reactivate",
    },
    // Soft delete: the row stays in the database with status DELETED.
    DELETE_USER: {
        label: "Delete",
        from: ["ACTIVE", "BLOCKED", "DEACTIVATED"],
        to: "DELETED",
        danger: true,
        verb: "delete",
    },
};

export function isActionName(value: unknown): value is ActionName {
    return typeof value === "string" && Object.hasOwn(ACTIONS, value);
}

// The buttons that make sense for a customer with this status.
export function actionsFor(status: string): ActionName[] {
    return (Object.keys(ACTIONS) as ActionName[]).filter((name) =>
        ACTIONS[name].from.includes(status as CustomerStatus),
    );
}