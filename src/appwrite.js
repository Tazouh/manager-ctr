import { Client, Account, Databases, Storage, ID } from "appwrite";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("69280af10010f0a6a844");

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { ID };
