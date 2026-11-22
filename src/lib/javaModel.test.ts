import { describe, expect, it } from 'vitest'
import { generateJavaModel } from './javaModel'

describe('JSON to Java model generator', () => {
  it('generates nested records, lists, nullable references, and Jackson names', () => {
    const source = '{"id":7,"profile":{"display-name":"Ada","active":true},"tags":["admin"],"nullable":null,"numbers":[1,2.5]}'
    const result = generateJavaModel(source, { className: 'ApiResponse', style: 'record' })

    expect(result).toContain('import com.fasterxml.jackson.annotation.JsonProperty;')
    expect(result).toContain('import java.math.BigDecimal;')
    expect(result).toContain('import java.util.List;')
    expect(result).toContain('public record ApiResponse(')
    expect(result).toContain('Integer id')
    expect(result).toContain('Profile profile')
    expect(result).toContain('List<String> tags')
    expect(result).toContain('Object nullable')
    expect(result).toContain('List<BigDecimal> numbers')
    expect(result).toContain('@JsonProperty("display-name")')
    expect(result).toContain('public record Profile(')
    expect(result).toContain('Boolean active')
  })

  it('generates no-argument JavaBeans with unique, valid names for conflicting keys', () => {
    const result = generateJavaModel('{"user-id":"a","user id":"b","class":null,"address":{"zip":1}}', {
      className: '1-api response',
      style: 'pojo',
    })

    expect(result).toContain('public class Type1ApiResponse {')
    expect(result).toContain('public Type1ApiResponse() {}')
    expect(result).toContain('private String userId;')
    expect(result).toContain('private String userId2;')
    expect(result).toContain('private Object classField;')
    expect(result).toContain('@JsonProperty("class")')
    expect(result).toContain('@JsonProperty("user id")')
    expect(result).toContain('public String getUserId()')
    expect(result).toContain('public void setUserId2(String userId2)')
    expect(result).toContain('public static class')
    expect(result).not.toContain('private int ')
    expect(result).not.toContain('private boolean ')
  })

  it('keeps POJO accessor names unique when property capitalization differs', () => {
    const result = generateJavaModel('{"a":1,"A":2}', { style: 'pojo' })
    expect(result).toContain('public Integer getA()')
    expect(result).toContain('public Integer getA2()')
    expect(result).toContain('@JsonProperty("a")')
  })

  it('merges object arrays and uses Object for empty or heterogeneous arrays', () => {
    const result = generateJavaModel('{"items":[{"id":1},{"name":"Ada","id":null}],"empty":[],"mixed":[1,"two"]}')

    expect(result).toContain('List<ItemsItem> items')
    expect(result).toContain('List<Object> empty')
    expect(result).toContain('List<Object> mixed')
    expect(result).toContain('Integer id')
    expect(result).toContain('String name')
  })

  it('escapes unusual JSON property names in Jackson annotations', () => {
    const result = generateJavaModel('{"quote\\"and\\nline":"value"}')

    expect(result).toContain('@JsonProperty("quote\\"and\\nline")')
  })

  it('rejects malformed JSON and non-object roots with useful errors', () => {
    expect(() => generateJavaModel('{bad json')).toThrow(/Invalid JSON/)
    expect(() => generateJavaModel('[{"id":1}]')).toThrow(/top-level JSON value must be an object/i)
    expect(() => generateJavaModel('null')).toThrow(/top-level JSON value must be an object/i)
  })

  it('rejects excessive nesting with a useful validation message', () => {
    const deeplyNested = `${'{"nested":'.repeat(66)}{}${'}'.repeat(66)}`
    expect(() => generateJavaModel(deeplyNested)).toThrow(/maximum 64 levels/i)
  })
})
