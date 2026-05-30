import client from "../client";
import { API } from "../endpoints";

export const getStates = async () => {
  const { data } = await client.get(
    API.LOCATION.STATES
  );

  return data.data;
};

export const getDistricts = async (
  stateId: number
) => {
  const { data } = await client.get(
    API.LOCATION.DISTRICTS(stateId)
  );

  return data.data;
};

export const getBlocks = async (
  districtId: number
) => {
  const { data } = await client.get(
    API.LOCATION.BLOCKS(districtId)
  );

  return data.data;
};