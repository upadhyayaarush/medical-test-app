import Map "mo:core/Map";
import Text "mo:core/Text";
import List "mo:core/List";
import Order "mo:core/Order";
import Migration "migration";



(with migration = Migration.run)
actor {
  type Patient = {
    name : Text;
    age : Nat;
    gender : Text;
    patientId : Text;
    doctorName : Text;
    highestEducation : Text;
    language : Text;
  };

  module Patient {
    public func compare(patient1 : Patient, patient2 : Patient) : Order.Order {
      Text.compare(patient1.name, patient2.name);
    };
  };

  type TrialResult = {
    totalTargets : Nat;
    correctStrikes : Nat;
    omissions : Nat;
    commissions : Nat;
    attemptedAt : Int;
  };

  type TestResult = {
    totalTargets : Nat;
    correctStrikes : Nat;
    omissions : Nat;
    commissions : Nat;
    elapsedSeconds : Nat;
    classification : Text;
    completedAt : Int;
  };

  type GridSnapshot = {
    rows : [[Text]];
    markedIds : [Text];
  };

  type TestSession = {
    patientId : Text;
    languageSelected : Text;
    startTime : Nat;
    endTime : Nat;
    trialResult : ?TrialResult;
    testResult : ?TestResult;
    doctorName : Text;
    patientName : Text;
    gridSnapshot : ?GridSnapshot;
  };

  module TestSession {
    public func compareByStartTime(session1 : TestSession, session2 : TestSession) : Order.Order {
      Nat.compare(session1.startTime, session2.startTime);
    };
  };

  let patients = Map.empty<Text, Patient>();
  let testSessions = List.empty<TestSession>();
  let doctors = Map.empty<Text, Text>();

  public shared func savePatient(patient : Patient) : async () {
    patients.add(patient.patientId, patient);
  };

  public query func getPatient(patientId : Text) : async ?Patient {
    patients.get(patientId);
  };

  public shared func saveTestSession(session : TestSession) : async () {
    testSessions.add(session);
  };

  public query func getSessionsByPatientId(patientId : Text) : async [TestSession] {
    testSessions.values().toArray().filter(
      func(session) {
        session.patientId == patientId;
      }
    ).sort(TestSession.compareByStartTime);
  };

  public query func getAllPatients() : async [Patient] {
    patients.values().toArray().sort();
  };

  public query func getAllTestSessions() : async [TestSession] {
    testSessions.toArray().sort(TestSession.compareByStartTime);
  };

  public query func getPatientFullRecord(patientId : Text) : async ?{ patient : Patient; sessions : [TestSession] } {
    switch (patients.get(patientId)) {
      case null null;
      case (?patient) {
        let sessions = testSessions.values().toArray().filter(
          func(session) {
            session.patientId == patientId;
          }
        ).sort(TestSession.compareByStartTime);
        ?{ patient; sessions };
      };
    };
  };

  public shared func saveDoctor(name : Text) : async () {
    doctors.add(name, name);
  };

  public query func getDoctors() : async [Text] {
    doctors.values().toArray();
  };

  public query func getSessionsByDoctor(doctorName : Text) : async [TestSession] {
    testSessions.values().toArray().filter(
      func(session) {
        session.doctorName == doctorName;
      }
    ).sort(TestSession.compareByStartTime);
  };
};
