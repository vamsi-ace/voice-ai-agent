const Groq = require("groq-sdk");
const dotenv = require("dotenv");
const { format, parse, isValid } = require("date-fns");
dotenv.config({ path: '.env.local' });

if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not defined in the environment variables");
}

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// In-Memory data for slots
const slotData = {
    "27 November": ["8 AM", "10 AM", "12 PM"],
    "28 November": ["1 PM", "2 PM", "3 PM"],
    "2 December": ["2 PM"]
};

// Function to parse date input
function parseDate(inputDate) {
    // parses input using date-fns
    const sanitizedDate = inputDate.replace(/\b(\d{1,2})(st|nd|rd|th)\b/i, "$1");

    const parsedDate = parse(sanitizedDate, "d MMMM", new Date());
    if (isValid(parsedDate)) {
        return format(parsedDate, "d MMMM"); // Returns as "27 November"
    }
    return null; // Returns null for invalid dates
}

// Function to get slots
function get_slots(date = null) {
    if (date) {
        return slotData[date] || [];
    }
    return Object.entries(slotData).map(([key, slots]) => ({
        date: key,
        slots
    }));
}

// Function to book a slot
function book_slot(date, time) {
    if (!slotData[date]) {
        return `No slots are available on ${date}.`;
    }

    const availableSlots = slotData[date];
    const slotIndex = availableSlots.indexOf(time);

    if (slotIndex > -1) {
        availableSlots.splice(slotIndex, 1); // Removes the booked slot
        return `The slot on ${date} at ${time} has been successfully booked!`;
    }

    return `The slot on ${date} at ${time} is unavailable or already booked.`;
}

// Helper function for adding messages to the stack
async function addMessageToStack(stack, role, content) {
    stack.push({ role, content });
}

// user query handling
async function getGroqChat(text, stack) {
    if (typeof text !== 'string' || !Array.isArray(stack)) {
        throw new Error("Invalid input: text should be a string and stack should be an array");
    }

    console.log('groq: request received');
    console.time('groq_api');

    await addMessageToStack(stack, 'user', text);

    let responseContent;

    try {
        if (/available slots/i.test(text)) {
            const slots = get_slots();
            responseContent = slots.map(({ date, slots }) =>
                `On ${date}, we have ${slots.join(", ")}.`).join("\n");

            if (!responseContent) {
                responseContent = "No slots are currently available.";
            }

            await addMessageToStack(stack, 'assistant', responseContent);
            console.timeEnd('groq_api');
            return responseContent; // Skip Groq API call
        } else if (/book slot/i.test(text)) {
            const dateMatch = text.match(/on (\d{1,2}(st|nd|rd|th)? \w+)/i); // Match date like "27 November" or "1st October"
            const timeMatch = text.match(/at (\d{1,2}(:\d{2})? (AM|PM))/i); // Match time like "10 AM"

            let responseContent = "";

            if (dateMatch && timeMatch) {
                const date = parseDate(dateMatch[1]); // Pass the matched date to parseDate
                const time = timeMatch[1]; // Extract the matched time

                if (!date) {
                    responseContent = "The specified date is invalid. Please use formats like '27 November' or '1st October'.";
                } else {
                    responseContent = `Slot booked on ${date} at ${time}.`;
                }
            } else {
                responseContent = "Please specify a valid date and time to book a slot. For example: 'Book slot on 28 November at 10 AM'.";
            }
            
            console.timeEnd('groq_api');
            return responseContent; // Skip Groq API call
        }

        // Default to using the Groq API for general queries
        const res = await groq.chat.completions.create({
            messages: stack,
            model: "llama3-70b-8192",
            stream: false
        });

        responseContent = res.choices[0]?.message?.content || "No response from Groq API";
        await addMessageToStack(stack, 'assistant', responseContent);

        console.timeEnd('groq_api');
        return responseContent;
    } catch (error) {
        console.error("Groq API error:", error);
        console.timeEnd('groq_api');
        throw new Error("Failed to get response from Groq API");
    }
}

module.exports = {
    getGroqResponse: getGroqChat,
    get_slots,
    book_slot
};
