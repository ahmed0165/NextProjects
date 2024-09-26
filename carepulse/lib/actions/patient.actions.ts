"use server";

import { Permission, Role } from "node-appwrite";
import { ID, Query } from "node-appwrite";
import {
  BUCKET_ID,
  DATABASE_ID,
  PATINET_COLLECTION_ID,
  PROJECT_ID,
  databases,
  users,
} from "../appwrite.config";
import { parseStringify } from "../utils";

// CREATE APPWRITE USER
export const createUser = async (user: CreateUserParams) => {
  try {
    const newuser = await users.create(
      ID.unique(),
      user.email,
      user.phone,
      undefined, // Password is optional
      user.name
    );

    return parseStringify(newuser);
  } catch (error: any) {
    if (error?.code === 409) {
      const existingUser = await users.list([
        Query.equal("email", [user.email]),
      ]);
      return existingUser.users[0];
    }
    console.error("An error occurred while creating a new user:", error);
  }
};

// GET USER
export const getUser = async (userId: string) => {
  try {
    const user = await users.get(userId);
    return parseStringify(user);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the user details:",
      error
    );
  }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryQuery(
  queryFn: () => Promise<any>,
  maxRetries = 3,
  delayMs = 1000
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await queryFn();
      if (result.total > 0) {
        return result;
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
    }
    if (attempt < maxRetries) {
      await delay(delayMs);
    }
  }
  throw new Error("Max retries reached, query failed");
}

export const registerPatient = async (patient: RegisterUserParams) => {
  try {
    console.log("Registering patient:", JSON.stringify(patient, null, 2));
    const newPatient = await databases.createDocument(
      DATABASE_ID!,
      PATINET_COLLECTION_ID!,
      ID.unique(),
      {
        ...patient,
        identificationDocumentId: null,
        identificationDocumentUrl: null,
      }
    );

    console.log("New patient registered:", JSON.stringify(newPatient, null, 2));
    return parseStringify(newPatient);
  } catch (error) {
    console.error("An error occurred while creating a new patient:", error);
    throw error;
  }
};

export const verifyPatientReadPermission = async (userId: string) => {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID!,
      PATINET_COLLECTION_ID!,
      [Query.equal("userId", [userId]), Query.limit(1)],
      [Permission.read(Role.user(userId))]
    );

    console.log("Permission check result:", result);
    return result.total > 0;
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false;
  }
};

export const getPatient = async (userId: string) => {
  try {
    console.log("Fetching patient for userId:", userId);
    const queryFn = () =>
      databases.listDocuments(DATABASE_ID!, PATINET_COLLECTION_ID!, [
        Query.equal("userId", [userId]),
      ]);

    const patients = await retryQuery(queryFn);
    console.log("Query result:", JSON.stringify(patients, null, 2));
    console.log("Patients found:", patients.documents.length);

    if (patients.documents.length === 0) {
      console.error("No patient found for userId:", userId);
      return null;
    }

    return parseStringify(patients.documents[0]);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the patient details:",
      error
    );
    return null;
  }
};
