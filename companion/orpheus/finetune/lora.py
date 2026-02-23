import torch
from datasets import load_from_disk
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, Trainer, TrainingArguments, AutoTokenizer
import numpy as np
import yaml

config_file = "config.yaml"

with open(config_file, "r") as file:
    config = yaml.safe_load(file)

dsn = config["TTS_dataset"]

model_name = config["model_name"]
run_name = config["run_name"]
project_name = config["project_name"]
base_repo_id = config["save_folder"]
epochs = config["epochs"]
batch_size = config["batch_size"]
save_steps = config["save_steps"]
pad_token = config["pad_token"]
number_processes = config["number_processes"]
learning_rate = config["learning_rate"]

lora_rank = 32
lora_alpha = 64
lora_dropout = 0.0

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name, attn_implementation="sdpa", torch_dtype=torch.bfloat16)

lora_config = LoraConfig(
    r=lora_rank,
    lora_alpha=lora_alpha,
    lora_dropout=lora_dropout,
    target_modules=["q_proj", "k_proj", "v_proj",  "o_proj", "gate_proj", "down_proj", "up_proj"],
    bias="none",
    modules_to_save=["lm_head", "embed_tokens"], # Optional to train the embeddings and lm head
    task_type="CAUSAL_LM",
    use_rslora=True,
)

model = get_peft_model(model, lora_config)

# TTS_dataset in config.yaml must be the local path written by prepare_dataset.py
# (the directory produced by dataset.save_to_disk()). Use load_from_disk, not
# load_dataset, because save_to_disk writes Arrow format — not a HF Hub dataset.
ds = load_from_disk(dsn)


def preprocess(example):
    """Tokenize 'speaker: text' into input_ids/attention_mask/labels for causal LM training.
    Wraps with Orpheus special tokens: [128259] + text_tokens + [128009, 128260, 128261, 128257]
    If the dataset already has input_ids, pass through unchanged."""
    if "input_ids" in example:
        if "labels" not in example:
            example["labels"] = example["input_ids"]
        return example

    prompt = f"{example['speaker']}: {example['text']}"
    tokens = tokenizer(prompt, add_special_tokens=False)
    start_token = [128259]
    end_tokens = [128009, 128260, 128261, 128257]
    input_ids = start_token + tokens["input_ids"] + end_tokens
    attention_mask = [1] * len(input_ids)
    return {"input_ids": input_ids, "attention_mask": attention_mask, "labels": input_ids}


def data_collator(features):
    """Pad input_ids, attention_mask, and labels to equal length within the batch."""
    input_ids = [f["input_ids"] for f in features]
    attention_mask = [f.get("attention_mask") or [1] * len(f["input_ids"]) for f in features]
    labels = [f.get("labels") or f["input_ids"] for f in features]

    input_ids = torch.nn.utils.rnn.pad_sequence(
        [torch.tensor(i, dtype=torch.long) for i in input_ids], batch_first=True, padding_value=pad_token)
    attention_mask = torch.nn.utils.rnn.pad_sequence(
        [torch.tensor(m, dtype=torch.long) for m in attention_mask], batch_first=True, padding_value=0)
    labels = torch.nn.utils.rnn.pad_sequence(
        [torch.tensor(l, dtype=torch.long) for l in labels], batch_first=True, padding_value=-100)

    return {"input_ids": input_ids, "attention_mask": attention_mask, "labels": labels}


# Tokenize the dataset if it has raw text columns instead of input_ids
train_ds = ds["train"] if "train" in ds else ds
eval_ds = ds.get("validation") if hasattr(ds, "get") else None

if "input_ids" not in train_ds.column_names:
    cols_to_remove = [c for c in train_ds.column_names if c not in ("input_ids", "attention_mask", "labels")]
    train_ds = train_ds.map(preprocess, remove_columns=cols_to_remove)
    if eval_ds is not None:
        eval_ds = eval_ds.map(preprocess, remove_columns=cols_to_remove)

training_args = TrainingArguments(
    overwrite_output_dir=True,
    num_train_epochs=epochs,
    per_device_train_batch_size=batch_size,
    logging_steps=1,
    bf16=True,
    output_dir=f"./{base_repo_id}",
    report_to="none",
    save_steps=save_steps,
    remove_unused_columns=False,
    learning_rate=learning_rate,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_ds,
    eval_dataset=eval_ds,
    data_collator=data_collator,
)

trainer.train()

merged_model = model.merge_and_unload()

merged_model.save_pretrained(f"./{base_repo_id}/merged")
tokenizer.save_pretrained(f"./{base_repo_id}/merged")
