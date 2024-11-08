//Message.jsx
import React from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2 } from "lucide-react";

const Message = React.memo(({ message, isOwnMessage, deleteMessage }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -50 }}
    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-4`}
  >
    <div
      className={`flex ${
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      } items-start max-w-[80%]`}
    >
      <Avatar className="w-12 h-12">
        <AvatarImage src={message.user_avatar} alt={message.user_name} />
        <AvatarFallback>{message.user_name?.charAt(0)}</AvatarFallback>
      </Avatar>
      <div
        className={`mx-2 py-3 px-4 rounded-lg ${
          isOwnMessage
            ? "bg-primary text-primary-foreground rounded-tr-none"
            : "bg-secondary text-secondary-foreground rounded-tl-none"
        }`}
      >
        <p className="text-sm font-semibold mb-1">{message.user_name}</p>

        {/* Conditional rendering for message content or image */}
        {message.image_url ? (
          <img
            src={message.image_url}
            alt="uploaded"
            className="rounded-lg max-w-full h-auto"
          />
        ) : (
          <p className="text-sm break-words">{message.content}</p>
        )}

        <p className="text-xs opacity-70 mt-1">
          {new Date(message.created_at).toLocaleTimeString()}
        </p>
        {/* Delete button - visible only for own messages */}
        {isOwnMessage && (
          <button
            onClick={() => deleteMessage(message.id)} // Call the delete function
            className="mt-2 text-red-600 hover:text-red-800"
            title="Delete message"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  </motion.div>
));

// Set display name for the memoized component
Message.displayName = "Message";

export default Message;
