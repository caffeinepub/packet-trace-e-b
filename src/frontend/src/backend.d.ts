import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;

export interface TopologyInput {
    name: string;
    description: string;
    topologyData: string;
}

export interface Topology {
    id: bigint;
    owner: Principal;
    name: string;
    description: string;
    topologyData: string;
    createdAt: bigint;
    updatedAt: bigint;
}

export interface TopologySummary {
    id: bigint;
    name: string;
    description: string;
    createdAt: bigint;
    updatedAt: bigint;
}

export type UserRole = { admin: null } | { user: null } | { guest: null };

export interface ModuleProgressInput {
    moduleId: bigint;
    score: bigint;
    completed: boolean;
}

export interface ModuleProgress {
    moduleId: bigint;
    score: bigint;
    completed: boolean;
    completedAt: bigint;
}

export interface CourseProgress {
    owner: Principal;
    modules: ModuleProgress[];
    certificateEarned: boolean;
    updatedAt: bigint;
}

export interface backendInterface {
    _initializeAccessControlWithSecret(userSecret: string): Promise<void>;
    getCallerUserRole(): Promise<UserRole>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    createTopology(input: TopologyInput): Promise<bigint>;
    getTopology(id: bigint): Promise<Topology | null>;
    listTopologies(): Promise<TopologySummary[]>;
    updateTopology(id: bigint, input: TopologyInput): Promise<boolean>;
    deleteTopology(id: bigint): Promise<boolean>;
    saveModuleProgress(input: ModuleProgressInput): Promise<boolean>;
    getCourseProgress(): Promise<CourseProgress | null>;
    hasCertificate(): Promise<boolean>;
    resetCourseProgress(): Promise<boolean>;
}
