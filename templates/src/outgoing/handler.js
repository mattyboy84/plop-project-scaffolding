
async function {{function_name}}(event, context) {
  console.log(`Outgoing Event: ${JSON.stringify(event)}`);
  console.log(`Context: ${JSON.stringify(context)}`);
}

module.exports = {
  {{function_name}},
};
