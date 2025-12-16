# Schema Usage and Adaptation

This document explains how to interpret, adapt, and extend the schemas provided in world-shard-continuity.

The schemas in this repository are intended as reference-grade foundations, not drop-in production requirements.

## Purpose of the Schemas

The schemas serve three primary goals:

1. **Define authoritative boundaries** — They formalize where identity, asset ownership, economic state, and world descriptors live.
2. **Enable interoperability** — They provide a common language that different engines, services, and shards can agree on.
3. **Prevent ambiguity** — Explicit structure reduces exploit surfaces, duplication bugs, and undefined behavior.

## Placeholder Identifiers and Domains

Some schema fields intentionally use placeholders, such as:

* `$id` values using `https://example.org/...`
* Generic ID prefixes (`pid_`, `aid_`, `wid_`, `sid_`)
* Abstract engine or provider labels

These are intentional.

### Why placeholders exist

* To avoid coupling the schemas to a specific organization or platform
* To make cloning and adaptation frictionless
* To encourage teams to substitute their own domains, ID formats, and authorities

### Recommended action for adopters

When implementing:

* Replace `example.org` with your own domain or schema registry
* Adjust ID prefixes to match internal conventions
* Preserve semantic meaning, not literal strings

## Required vs Flexible Fields

The schemas intentionally balance strictness and flexibility.

### Strict fields

These fields should rarely change:

* Identity and asset identifiers
* Scope and authority markers
* Transactional and audit fields

They exist to protect continuity and integrity.

### Flexible fields

These fields are designed for extension:

* `metadata`
* `attributes`
* `notes`
* World- or engine-specific references

Teams are encouraged to extend these areas rather than weakening core constraints.

## Engine and Platform Neutrality

No schema assumes:

* A specific game engine
* A networking model
* A storage backend
* A monetization strategy

This allows:

* Single-engine implementations
* Hybrid engine platforms
* Incremental adoption in legacy systems

## Backward and Forward Compatibility

Each schema includes a `schema_version` field.

### Guidelines

* Minor extensions should not break existing consumers
* Breaking changes should increment the major version
* Consumers should validate version compatibility explicitly

## Auditing and Compliance

Audit-related fields are first-class by design.

Even teams that do not expose audit logs publicly should:

* Preserve mutation history internally
* Support replay and forensic analysis
* Treat auditability as a safety feature, not overhead

## What These Schemas Do Not Enforce

The schemas do not enforce:

* Business models
* Balance decisions
* Monetization mechanics
* Real-money or legal compliance rules

Those concerns belong to higher-level systems and policies.

## Recommended Adoption Path

For teams evaluating these schemas:

1. Read the continuity docs first
2. Review the contracts to understand guarantees
3. Adapt schemas to your internal conventions
4. Enforce schemas at system boundaries
5. Iterate conservatively

## Summary

The schemas in world-shard-continuity are intentionally opinionated where correctness matters and intentionally flexible where innovation should occur. They are designed to be cloned, adapted, and extended without compromising continuity, integrity, or trust.
