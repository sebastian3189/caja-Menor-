namespace CajaMenor.Application.Common;

public class Result<T>
{
    public bool Success { get; private set; }
    public T? Data { get; private set; }
    public string? Error { get; private set; }
    public List<string> Errors { get; private set; } = [];

    public static Result<T> Ok(T data) => new() { Success = true, Data = data };
    public static Result<T> Fail(string error) => new() { Success = false, Error = error };
    public static Result<T> Fail(List<string> errors) => new() { Success = false, Errors = errors };
}

public class Result
{
    public bool Success { get; private set; }
    public string? Error { get; private set; }
    public List<string> Errors { get; private set; } = [];

    public static Result Ok() => new() { Success = true };
    public static Result Fail(string error) => new() { Success = false, Error = error };
    public static Result Fail(List<string> errors) => new() { Success = false, Errors = errors };
}
