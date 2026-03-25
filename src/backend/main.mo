import AccessControl "./authorization/access-control";
import MixinAuthorization "./authorization/MixinAuthorization";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

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
        ignore topologies.remove(id);
        true
      };
      case null { false };
    }
  };
};
