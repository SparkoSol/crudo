-- Add conversation state tracking to voice_transcripts
ALTER TABLE voice_transcripts 
ADD COLUMN IF NOT EXISTS conversation_state TEXT DEFAULT 'transcribed',
ADD COLUMN IF NOT EXISTS missing_required_fields JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS collected_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS current_field_index INTEGER DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN voice_transcripts.conversation_state IS 'Current state: transcribed, collecting_fields, awaiting_confirmation, confirmed, retaken';
COMMENT ON COLUMN voice_transcripts.missing_required_fields IS 'Ordered list of required field names still needed from user';
COMMENT ON COLUMN voice_transcripts.collected_data IS 'Fields collected through WhatsApp conversation';
COMMENT ON COLUMN voice_transcripts.current_field_index IS 'Index of current field being collected from missing_required_fields array';

-- Create index for efficient queries on conversation state
CREATE INDEX IF NOT EXISTS idx_voice_transcripts_conversation_state 
ON voice_transcripts(conversation_state) 
WHERE conversation_state IN ('collecting_fields', 'awaiting_confirmation');

-- Create index for phone number + state queries (used when processing incoming messages)
CREATE INDEX IF NOT EXISTS idx_voice_transcripts_phone_state 
ON voice_transcripts(phone_number, conversation_state, created_at DESC);
