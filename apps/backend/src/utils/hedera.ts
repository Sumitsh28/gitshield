import {
  Client,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";
import dotenv from "dotenv";

dotenv.config();

export const getHederaClient = () => {
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;

  if (!accountId || !privateKey) {
    throw new Error("Hedera environment variables missing!");
  }

  const client = Client.forTestnet();
  client.setOperator(accountId, PrivateKey.fromStringDer(privateKey));

  return client;
};

export const createTopic = async () => {
  const client = getHederaClient();

  const txResponse = await new TopicCreateTransaction().execute(client);
  const receipt = await txResponse.getReceipt(client);

  return receipt.topicId?.toString();
};

export const submitMessageToTopic = async (
  topicId: string,
  message: string,
) => {
  const client = getHederaClient();

  const txResponse = await new TopicMessageSubmitTransaction({
    topicId,
    message,
  }).execute(client);

  const receipt = await txResponse.getReceipt(client);

  return txResponse.transactionId.toString();
};
