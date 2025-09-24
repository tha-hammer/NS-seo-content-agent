client<llm> OpenaiWriter {
  provider openai
  options {
    model gpt-4o-mini
    api_key env.OPENAI_API_KEY
    temperature 0.3
    max_tokens 4096
  }
}

client<llm> OpenaiEditor {
  provider openai
  options {
    model gpt-4o
    api_key env.OPENAI_API_KEY
    temperature 0.1
    max_tokens 4096
  }
}