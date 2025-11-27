import { Client, Account, Databases, Storage } from "appwrite";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1") // ton endpoint Appwrite
  .setProject("6928a8fe1001f0ae8a444"); // ton Project ID exact

export const account = new Account(client);
export const db = new Databases(client);
export const storage = new Storage(client);
