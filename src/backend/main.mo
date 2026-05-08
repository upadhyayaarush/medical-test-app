import Map "mo:core/Map";
import Text "mo:core/Text";
import List "mo:core/List";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";

actor {
  type Patient = {
    name : Text;
    age : Nat;
    gender : Text;
    patientId : Text;
  };

  module Patient {
    public func compare(patient1 : Patient, patient2 : Patient) : Order.Order {
      Text.compare(patient1.name, patient2.name);
    };
  };

  type TestSession = {
    patientId : Text;
    languageSelected : Text;
    startTime : Nat;
    endTime : Nat;
  };

  module TestSession {
    public func compareByStartTime(session1 : TestSession, session2 : TestSession) : Order.Order {
      Nat.compare(session1.startTime, session2.startTime);
    };
  };

  let patients = Map.empty<Text, Patient>();
  let testSessions = List.empty<TestSession>();

  public shared ({ caller }) func savePatient(patient : Patient) : async () {
    patients.add(patient.patientId, patient);
  };

  public query ({ caller }) func getPatient(patientId : Text) : async ?Patient {
    patients.get(patientId);
  };

  public shared ({ caller }) func saveTestSession(session : TestSession) : async () {
    testSessions.add(session);
  };

  public query ({ caller }) func getSessionsByPatientId(patientId : Text) : async [TestSession] {
    testSessions.values().toArray().filter(
      func(session) {
        session.patientId == patientId;
      }
    ).sort(TestSession.compareByStartTime);
  };

  public query ({ caller }) func getAllPatients() : async [Patient] {
    patients.values().toArray().sort();
  };

  public query ({ caller }) func getAllTestSessions() : async [TestSession] {
    testSessions.toArray().sort(TestSession.compareByStartTime);
  };
};
