/**
 * A function to send request to the punctuation API
 * Parameter: text
 */
export const sendRequest = async (text) => {
  const response = await fetch(process.env.PUNCTUATION_API_ADDRESS, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: text,
      submodule: "punctuation",
      module: "stt",
    }),
  });
  const data = await response.json();
  console.log(data);
  return data;
};
