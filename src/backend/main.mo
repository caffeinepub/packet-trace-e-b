import AccessControl "./authorization/access-control";
import MixinAuthorization "./authorization/MixinAuthorization";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // ===== TOPOLOGY TYPES =====
  public type Topology = {
    id : Nat;
    owner : Principal;
    name : Text;
    description : Text;
    topologyData : Text;
    createdAt : Int;
    updatedAt : Int;
  };

  public type TopologyInput = {
    name : Text;
    description : Text;
    topologyData : Text;
  };

  public type TopologySummary = {
    id : Nat;
    name : Text;
    description : Text;
    createdAt : Int;
    updatedAt : Int;
  };

  var nextId : Nat = 0;
  let topologies = Map.empty<Nat, Topology>();

  public shared ({ caller }) func createTopology(input : TopologyInput) : async Nat {
    if (caller.isAnonymous()) { return 0 };
    let id = nextId;
    nextId += 1;
    topologies.add(id, {
      id;
      owner = caller;
      name = input.name;
      description = input.description;
      topologyData = input.topologyData;
      createdAt = Time.now();
      updatedAt = Time.now();
    });
    id
  };

  public query ({ caller }) func getTopology(id : Nat) : async ?Topology {
    switch (topologies.get(id)) {
      case (?t) { if (t.owner == caller) ?t else null };
      case null { null };
    }
  };

  public query ({ caller }) func listTopologies() : async [TopologySummary] {
    let owned = topologies.values().filter(func(t : Topology) : Bool { t.owner == caller });
    owned.map(func(t : Topology) : TopologySummary {
      { id = t.id; name = t.name; description = t.description; createdAt = t.createdAt; updatedAt = t.updatedAt }
    }).toArray()
  };

  public shared ({ caller }) func updateTopology(id : Nat, input : TopologyInput) : async Bool {
    switch (topologies.get(id)) {
      case (?t) {
        if (t.owner != caller) return false;
        topologies.add(id, {
          id = t.id; owner = t.owner;
          name = input.name; description = input.description;
          topologyData = input.topologyData;
          createdAt = t.createdAt; updatedAt = Time.now();
        });
        true
      };
      case null { false };
    }
  };

  public shared ({ caller }) func deleteTopology(id : Nat) : async Bool {
    switch (topologies.get(id)) {
      case (?t) {
        if (t.owner != caller) return false;
        topologies.remove(id);
        true
      };
      case null { false };
    }
  };

  // ===== COURSE PROGRESS TYPES =====
  public type ModuleProgress = {
    moduleId : Nat;
    score : Nat;
    completed : Bool;
    completedAt : Int;
  };

  public type CourseProgress = {
    owner : Principal;
    modules : [ModuleProgress];
    certificateEarned : Bool;
    updatedAt : Int;
  };

  public type ModuleProgressInput = {
    moduleId : Nat;
    score : Nat;
    completed : Bool;
  };

  let courseProgress = Map.empty<Principal, CourseProgress>();
  let TOTAL_MODULES : Nat = 8;
  let PASS_SCORE : Nat = 70;

  public shared ({ caller }) func saveModuleProgress(input : ModuleProgressInput) : async Bool {
    if (caller.isAnonymous()) { return false };
    let existing = switch (courseProgress.get(caller)) {
      case (?p) { p.modules };
      case null { [] };
    };
    // Filter out old entry for this module
    let filtered = existing.vals()
      .filter(func(m : ModuleProgress) : Bool { m.moduleId != input.moduleId })
      .toArray();
    let newMod : ModuleProgress = {
      moduleId = input.moduleId;
      score = input.score;
      completed = input.completed;
      completedAt = Time.now();
    };
    // Append new entry
    let updated = filtered.vals().concat([newMod].vals()).toArray();
    let allDone = updated.size() == TOTAL_MODULES and updated.vals().all(
      func(m : ModuleProgress) : Bool { m.completed and m.score >= PASS_SCORE }
    );
    courseProgress.add(caller, {
      owner = caller;
      modules = updated;
      certificateEarned = allDone;
      updatedAt = Time.now();
    });
    true
  };

  public query ({ caller }) func getCourseProgress() : async ?CourseProgress {
    if (caller.isAnonymous()) { return null };
    courseProgress.get(caller)
  };

  public query ({ caller }) func hasCertificate() : async Bool {
    if (caller.isAnonymous()) { return false };
    switch (courseProgress.get(caller)) {
      case (?p) { p.certificateEarned };
      case null { false };
    }
  };

  public shared ({ caller }) func resetCourseProgress() : async Bool {
    if (caller.isAnonymous()) { return false };
    courseProgress.remove(caller);
    true
  };
};
