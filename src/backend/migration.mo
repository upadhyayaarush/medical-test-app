import List "mo:core/List";
import Map "mo:core/Map";

module {
  // Old types — inline copy from .old/src/backend/main.mo
  type OldTrialResult = {
    totalTargets : Nat;
    correctStrikes : Nat;
    omissions : Nat;
    commissions : Nat;
    attemptedAt : Int;
  };

  type OldTestResult = {
    totalTargets : Nat;
    correctStrikes : Nat;
    omissions : Nat;
    commissions : Nat;
    elapsedSeconds : Nat;
    classification : Text;
    completedAt : Int;
  };

  type OldTestSession = {
    patientId : Text;
    languageSelected : Text;
    startTime : Nat;
    endTime : Nat;
    trialResult : ?OldTrialResult;
    testResult : ?OldTestResult;
    doctorName : Text;
    patientName : Text;
  };

  type OldPatient = {
    name : Text;
    age : Nat;
    gender : Text;
    patientId : Text;
    doctorName : Text;
    highestEducation : Text;
    language : Text;
  };

  type OldActor = {
    patients : Map.Map<Text, OldPatient>;
    testSessions : List.List<OldTestSession>;
    doctors : Map.Map<Text, Text>;
  };

  // New types
  type GridSnapshot = {
    rows : [[Text]];
    markedIds : [Text];
  };

  type NewTrialResult = OldTrialResult;
  type NewTestResult = OldTestResult;

  type NewTestSession = {
    patientId : Text;
    languageSelected : Text;
    startTime : Nat;
    endTime : Nat;
    trialResult : ?NewTrialResult;
    testResult : ?NewTestResult;
    doctorName : Text;
    patientName : Text;
    gridSnapshot : ?GridSnapshot;
  };

  type NewPatient = OldPatient;

  type NewActor = {
    patients : Map.Map<Text, NewPatient>;
    testSessions : List.List<NewTestSession>;
    doctors : Map.Map<Text, Text>;
  };

  public func run(old : OldActor) : NewActor {
    let newSessions = old.testSessions.map<OldTestSession, NewTestSession>(
      func(s) {
        { s with gridSnapshot = null };
      }
    );
    {
      patients = old.patients;
      testSessions = newSessions;
      doctors = old.doctors;
    };
  };
};
