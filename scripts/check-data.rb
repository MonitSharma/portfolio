# Fails when a value in _data/*.yml looks numeric but YAML loads it as a string.
# Ruby's YAML (1.1) reads `3.89e9` as the string "3.89e9", so Liquid maths on it
# silently returns 0. Write `3.89e+9` (or a plain number) instead.
require "yaml"
require "date"

NUMERIC_STRING = /\A[-+]?\d+(\.\d+)?[eE]\d+\z/
problems = []

def walk(node, path, &block)
  case node
  when Hash then node.each { |k, v| walk(v, "#{path}.#{k}", &block) }
  when Array then node.each_with_index { |v, i| walk(v, "#{path}[#{i}]", &block) }
  else yield(node, path)
  end
end

Dir[File.join(__dir__, "..", "_data", "*.yml")].sort.each do |file|
  data = YAML.safe_load(File.read(file), aliases: true, permitted_classes: [Date, Time])
  walk(data, File.basename(file)) do |value, path|
    problems << "#{path}: #{value.inspect} loads as text; write it as #{value.sub(/e(\d)/i, 'e+\1')}" if value.is_a?(String) && value.match?(NUMERIC_STRING)
  end
end

if problems.empty?
  puts "Data check passed: no numbers stored as text."
else
  warn problems
  exit 1
end
